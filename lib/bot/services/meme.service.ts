import { promises as fs } from 'fs';
import path from 'path';

import { sendChatCompletion } from '@/lib/openrouter';

type MemeResult = {
  caption: string;
  imageBytes?: Buffer;
  mimeType?: string;
};

type BotResponse = {
  content: string;
  type: 'text' | 'image';
  mediaUrl?: string;
};

function buildPublicUrl(filename: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  return base ? `${base}/memes/${filename}` : '';
}

async function ensureMemeDir() {
  const dir = path.join(process.cwd(), 'public', 'memes');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function generateMemePrompt(userMessage: string) {
  const system = [
    'Você é um criador de memes do Corinthians.',
    'Gere um JSON com as chaves: prompt, caption.',
    'prompt: descrição curta e visual para gerar imagem de meme engraçado do Corinthians.',
    'caption: legenda curta e engraçada em português.',
    'Responda APENAS com o JSON, sem markdown.',
  ].join('\n');

  const response = await sendChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
    {
      temperature: 0.8,
      maxTokens: 200,
    }
  );

  const text = response.content?.trim() || '';
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      prompt: String(parsed.prompt || userMessage),
      caption: String(parsed.caption || 'Meme da Fiel'),
    };
  } catch {
    return {
      prompt: userMessage,
      caption: 'Meme da Fiel',
    };
  }
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], 'base64'),
  };
}

async function fetchImageBytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenRouter image fetch error: ${res.status}`);
  }
  const mimeType = res.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mimeType, bytes: buffer };
}

async function generateOpenRouterImage(prompt: string): Promise<MemeResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  // Use the correct OpenRouter API format for image generation
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'FIEL.IA - Meme Generator',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `Generate a funny Corinthians football meme image: ${prompt}`,
        },
      ],
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: '1:1',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter image API error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenRouter image response:', JSON.stringify(data, null, 2));

  // Extract image from response
  const choice = data.choices?.[0];
  const message = choice?.message;

  // Check for images array in message
  if (message?.images && message.images.length > 0) {
    const imageData = message.images[0];

    // Handle base64 data URL
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      const parsed = parseDataUrl(imageData);
      if (parsed) {
        return {
          caption: 'Meme da Fiel',
          imageBytes: parsed.bytes,
          mimeType: parsed.mimeType,
        };
      }
    }

    // Handle URL
    if (typeof imageData === 'string' && imageData.startsWith('http')) {
      const fetched = await fetchImageBytes(imageData);
      return {
        caption: 'Meme da Fiel',
        imageBytes: fetched.bytes,
        mimeType: fetched.mimeType,
      };
    }

    // Handle object with url or data property
    if (typeof imageData === 'object') {
      const url = imageData.url || imageData.data;
      if (url && url.startsWith('data:')) {
        const parsed = parseDataUrl(url);
        if (parsed) {
          return {
            caption: 'Meme da Fiel',
            imageBytes: parsed.bytes,
            mimeType: parsed.mimeType,
          };
        }
      }
      if (url && url.startsWith('http')) {
        const fetched = await fetchImageBytes(url);
        return {
          caption: 'Meme da Fiel',
          imageBytes: fetched.bytes,
          mimeType: fetched.mimeType,
        };
      }
    }
  }

  // Check content array for image parts
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === 'image' || part.type === 'image_url') {
        const imageUrl = part.image_url?.url || part.url || part.data;
        if (imageUrl) {
          if (imageUrl.startsWith('data:')) {
            const parsed = parseDataUrl(imageUrl);
            if (parsed) {
              return {
                caption: 'Meme da Fiel',
                imageBytes: parsed.bytes,
                mimeType: parsed.mimeType,
              };
            }
          }
          if (imageUrl.startsWith('http')) {
            const fetched = await fetchImageBytes(imageUrl);
            return {
              caption: 'Meme da Fiel',
              imageBytes: fetched.bytes,
              mimeType: fetched.mimeType,
            };
          }
        }
      }
    }
  }

  throw new Error('OpenRouter image response missing image data');
}

export async function generateMeme(userId: string, message: string): Promise<BotResponse> {
  let prompt = message;
  let caption = 'Meme da Fiel';

  try {
    const promptResult = await generateMemePrompt(message);
    prompt = promptResult.prompt;
    caption = promptResult.caption;
  } catch (error) {
    console.error('Meme prompt error:', error);
  }

  try {
    const result = await generateOpenRouterImage(prompt);
    const dir = await ensureMemeDir();
    const ext = result.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const filename = `meme-${Date.now()}.${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, result.imageBytes || Buffer.alloc(0));

    const mediaUrl = buildPublicUrl(filename);
    if (!mediaUrl) {
      throw new Error('Missing NEXT_PUBLIC_APP_URL to build meme URL');
    }

    return {
      content: caption,
      type: 'image',
      mediaUrl,
    };
  } catch (error) {
    console.error('Meme generation error:', error);
    return {
      content: `${caption}\n\nNão consegui gerar a imagem agora. Tente novamente em instantes.`,
      type: 'text',
    };
  }
}
