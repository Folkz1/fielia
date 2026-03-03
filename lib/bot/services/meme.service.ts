import { promises as fs } from 'fs';
import path from 'path';

import { sendChatCompletion } from '@/lib/openrouter';

type BotResponse = {
  content: string;
  type: 'text' | 'image';
  mediaUrl?: string;
};

function buildPublicUrl(filename: string) {
  // URL relativa - funciona em qualquer dominio (dev e producao)
  return `/api/memes/image/${filename}`;
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

/**
 * Extrai bytes de imagem da resposta do OpenRouter
 * Suporta multiplos formatos de resposta:
 * - images[]: array de objetos {type: "image_url", image_url: {url: "data:..."}}
 * - images[]: array de strings data URL
 * - content[]: array de partes com type image_url
 */
function extractImageFromResponse(msg: Record<string, unknown>): { bytes: Buffer; mimeType: string } | null {
  // 1. Check images array (formato atual do Gemini via OpenRouter)
  if (msg?.images && Array.isArray(msg.images) && msg.images.length > 0) {
    for (const img of msg.images as unknown[]) {
      // Object format: { type: "image_url", image_url: { url: "data:..." } }
      if (typeof img === 'object' && img !== null) {
        const imgObj = img as Record<string, unknown>;
        const imageUrl = imgObj.image_url as Record<string, unknown> | undefined;
        const url = imageUrl?.url as string | undefined;

        if (url && typeof url === 'string') {
          if (url.startsWith('data:')) {
            const parsed = parseDataUrl(url);
            if (parsed) return parsed;
          }
        }

        // Direct url on object
        const directUrl = imgObj.url as string | undefined;
        if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('data:')) {
          const parsed = parseDataUrl(directUrl);
          if (parsed) return parsed;
        }

        // b64_json format
        const b64 = imgObj.b64_json as string | undefined;
        if (b64) {
          return {
            bytes: Buffer.from(b64, 'base64'),
            mimeType: (imgObj.mime_type as string) || 'image/png',
          };
        }
      }

      // String data URL format
      if (typeof img === 'string' && img.startsWith('data:')) {
        const parsed = parseDataUrl(img);
        if (parsed) return parsed;
      }
    }
  }

  // 2. Check content array
  if (Array.isArray(msg?.content)) {
    for (const part of msg.content as Record<string, unknown>[]) {
      if (part.type === 'image_url' || part.type === 'image') {
        const imageUrl = part.image_url as Record<string, unknown> | undefined;
        const url = (imageUrl?.url || part.url || part.data) as string | undefined;

        if (url && typeof url === 'string' && url.startsWith('data:')) {
          const parsed = parseDataUrl(url);
          if (parsed) return parsed;
        }
      }
    }
  }

  return null;
}

async function generateOpenRouterImage(prompt: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-preview-image-generation';

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

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
          content: `Gere uma imagem de meme de alta qualidade sobre o Corinthians. O texto no meme deve estar em PORTUGUÊS e sem erros de ortografia. Estilo: meme de internet, engracado, com boa resolucao. Tema: ${prompt}`,
        },
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Meme] OpenRouter API error:', response.status, errorText.slice(0, 200));
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;

  if (!msg) {
    throw new Error('OpenRouter response missing message');
  }

  const image = extractImageFromResponse(msg as Record<string, unknown>);
  if (!image) {
    console.error('[Meme] No image in response. Keys:', Object.keys(msg));
    throw new Error('OpenRouter response missing image data');
  }

  return image;
}

export async function generateMeme(userId: string, message: string): Promise<BotResponse> {
  let prompt = message;
  let caption = 'Meme da Fiel';

  try {
    const promptResult = await generateMemePrompt(message);
    prompt = promptResult.prompt;
    caption = promptResult.caption;
  } catch (error) {
    console.error('[Meme] Prompt error:', error);
  }

  try {
    const result = await generateOpenRouterImage(prompt);
    const dir = await ensureMemeDir();
    const ext = result.mimeType.includes('jpeg') || result.mimeType.includes('jpg') ? 'jpg' : 'png';
    const filename = `meme-${Date.now()}.${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, result.bytes);

    const mediaUrl = buildPublicUrl(filename);

    return {
      content: caption,
      type: 'image',
      mediaUrl,
    };
  } catch (error) {
    console.error('[Meme] Generation error:', error);
    return {
      content: `${caption}\n\nNão consegui gerar a imagem agora. Tente novamente em instantes.`,
      type: 'text',
    };
  }
}
