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

async function generateGeminiImage(prompt: string): Promise<MemeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL;

  if (!apiKey || !model) {
    throw new Error('Missing GEMINI_API_KEY or GEMINI_IMAGE_MODEL');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini image error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((part: any) => part.inlineData?.data);

  if (!inline?.inlineData?.data) {
    throw new Error('Gemini image response missing inlineData');
  }

  const mimeType = inline.inlineData.mimeType || 'image/png';
  const buffer = Buffer.from(inline.inlineData.data, 'base64');

  return { caption: 'Meme da Fiel', imageBytes: buffer, mimeType };
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
    const result = await generateGeminiImage(prompt);
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
