import { promises as fs } from 'fs';
import path from 'path';

import { OpenRouter } from '@openrouter/sdk';
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
    'prompt: descrição curta e visual para gerar imagem.',
    'caption: legenda curta e engraçada.',
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
    const parsed = JSON.parse(text);
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

async function logGenerationCost(client: OpenRouter, responseId?: string | null) {
  if (!responseId) return;
  try {
    const generation = await client.generations.getGeneration({ id: responseId });
    const data = generation?.data;
    if (data) {
      console.info('OpenRouter generation cost:', {
        id: data.id,
        model: data.model,
        totalCost: data.totalCost,
        provider: data.providerName,
      });
    }
  } catch (error) {
    console.warn('OpenRouter generation lookup failed:', error);
  }
}

async function generateOpenRouterImage(prompt: string): Promise<MemeResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.0-nanobanana';

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const client = new OpenRouter({ apiKey });
  const result = client.callModel({
    model,
    input: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    modalities: ['image'],
  });

  const response = await result.getResponse();
  const toolCalls = await result.getToolCalls();
  await logGenerationCost(client, response?.id);

  const outputItems = Array.isArray(response.output) ? response.output : [response.output];
  const imageItem = outputItems.find(
    (item: any) => item?.type === 'image_generation_call' && item?.result
  );

  if (!imageItem?.result) {
    if (toolCalls.length > 0) {
      console.warn('OpenRouter returned tool calls without image output:', toolCalls);
    }
    throw new Error('OpenRouter image response missing result');
  }

  const imageResult = String(imageItem.result);
  const dataUrl = parseDataUrl(imageResult);

  if (dataUrl) {
    return {
      caption: 'Meme da Fiel',
      imageBytes: dataUrl.bytes,
      mimeType: dataUrl.mimeType,
    };
  }

  const fetched = await fetchImageBytes(imageResult);
  return { caption: 'Meme da Fiel', imageBytes: fetched.bytes, mimeType: fetched.mimeType };
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
