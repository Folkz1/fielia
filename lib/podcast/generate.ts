import { sendChatCompletion } from '@/lib/openrouter';
import { prisma } from '@/lib/prisma';

const TTS_VOICE = process.env.TTS_VOICE || 'echo';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
}

interface PodcastResult {
  id: string;
  title: string;
  script: string;
  newsIds: string[];
  model: string;
  ttsModel: string;
  estimatedCostUsd: number;
}

function getDefaultPodcastPrompt(): string {
  return `Você é o locutor do "Voz da Fiel" - boletim diário relâmpago da torcida do Corinthians.

FORMATO: BOLETIM DE RÁDIO RÁPIDO (máximo 30 segundos de áudio)

ESTILO:
- Energia de rádio esportiva profissional, estilo Jovem Pan Esportes
- Tom: vibrante, carismático, ritmo dinâmico
- Gírias naturais: "Fiel", "Timão", "mano", "bora"
- Frases CURTAS e IMPACTANTES - cada notícia em 1-2 frases
- Ênfase dramática nas manchetes, pausas estratégicas

ESTRUTURA OBRIGATÓRIA:
1. ABERTURA (1 frase curta): "Salve Fiel! Boletim Voz da Fiel!"
2. NOTÍCIAS (1-2 frases cada, máximo 3 notícias): Fato + opinião rápida
3. FECHAMENTO (1 frase): "Vai Corinthians!"

REGRAS:
- MÁXIMO 450 caracteres total (ideal 30 segundos de áudio)
- NUNCA invente fatos - use SOMENTE o que está nas notícias
- Não mencione fontes, sites ou "segundo"
- Texto corrido para ser NARRADO EM VOZ ALTA (sem marcadores, bullets ou emojis)
- Transições rápidas: "E mais:", "Destaque:", "Olha só:"
- Se tiver notícia ruim, seja realista mas motivacional`;
}

async function getPodcastPrompt(): Promise<string> {
  try {
    const config = await (prisma as any).siteConfig?.findUnique({
      where: { key: 'podcast_prompt' },
    });
    if (config?.value) return config.value;
  } catch {
    // fallback
  }
  return getDefaultPodcastPrompt();
}

async function getPodcastVoice(): Promise<string> {
  try {
    const config = await (prisma as any).siteConfig?.findUnique({
      where: { key: 'podcast_voice' },
    });
    if (config?.value) return config.value;
  } catch {
    // fallback
  }
  return TTS_VOICE;
}

export async function generatePodcastScript(news: NewsItem[]): Promise<{ script: string; model: string }> {
  const prompt = await getPodcastPrompt();

  const newsText = news.map((n, i) => {
    return `NOTICIA ${i + 1}: ${n.title}\n${n.content.slice(0, 800)}`;
  }).join('\n\n---\n\n');

  const model = process.env.OPENROUTER_MODEL;
  const response = await sendChatCompletion(
    [
      { role: 'system', content: prompt },
      { role: 'user', content: `Gere o boletim relâmpago de hoje com base nestas notícias (máximo 3 notícias, máximo 450 caracteres total para 30 segundos de áudio):\n\n${newsText}` },
    ],
    { temperature: 0.8, maxTokens: 400, model }
  );

  return { script: response.content.trim(), model: response.model || 'unknown' };
}

function pcm16ToWav(pcmData: Buffer): Buffer {
  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export async function generateAudio(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY nao configurada');

  const voice = await getPodcastVoice();
  const model = process.env.TTS_MODEL || 'openai/gpt-4o-audio-preview';

  console.log(`[Podcast TTS] Gerando audio: modelo=${model}, voz=${voice}, chars=${text.length}`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      modalities: ['text', 'audio'],
      audio: { voice, format: 'pcm16' },
      messages: [
        {
          role: 'system',
          content: 'Você é um locutor profissional de rádio esportiva brasileira, estilo Jovem Pan Esportes. Sua voz é vibrante, carismática, com ritmo dinâmico. Leia o texto EXATAMENTE como está escrito, palavra por palavra. Use entonação natural de rádio: ênfase nas manchetes, pausas dramáticas antes de resultados, aceleração na narração de jogadas. NÃO adicione nada, NÃO comente, NÃO improvise. Apenas narre com energia, clareza e profissionalismo de rádio ao vivo.',
        },
        {
          role: 'user',
          content: `Narre este boletim esportivo ao vivo agora: ${text.slice(0, 2048)}`,
        },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS falhou: HTTP ${response.status} - ${errorText.slice(0, 300)}`);
  }

  // Parse SSE stream to collect base64 audio chunks (pcm16)
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const audioChunks: string[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const data = JSON.parse(line.slice(6));
        const audioData = data.choices?.[0]?.delta?.audio?.data;
        if (audioData) audioChunks.push(audioData);
      } catch {
        // skip malformed chunks
      }
    }
  }

  if (!audioChunks.length) {
    throw new Error('Nenhum audio recebido do modelo. Verifique se o modelo suporta audio output.');
  }

  console.log(`[Podcast TTS] Audio recebido: ${audioChunks.length} chunks`);
  const pcmBase64 = audioChunks.join('');
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');

  return pcm16ToWav(pcmBuffer);
}

export async function generatePodcast(news: NewsItem[]): Promise<PodcastResult> {
  if (!news.length) throw new Error('Nenhuma noticia para gerar podcast');

  // 1. Gerar script (boletim rapido)
  const { script, model } = await generatePodcastScript(news);

  // 2. Gerar audio
  const audioBuffer = await generateAudio(script);

  // 3. Salvar no banco
  const today = new Date().toISOString().split('T')[0];
  const title = `Voz da Fiel - ${today}`;
  const newsIds = news.map(n => n.id);
  const voice = await getPodcastVoice();
  const ttsModel = process.env.TTS_MODEL || 'openai/gpt-4o-audio-preview';

  // Estimate cost (gpt-4o-audio-preview: ~$2.40/M input, ~$9.60/M output audio tokens)
  // Rough: ~1 token per 4 chars input, audio output ~150 tokens per second at 24kHz
  const inputChars = script.length;
  const estimatedInputTokens = Math.ceil(inputChars / 4);
  const estimatedAudioSeconds = Math.ceil(inputChars / 15); // ~15 chars/sec speech
  const estimatedOutputTokens = estimatedAudioSeconds * 150;
  const estimatedCostUsd =
    (estimatedInputTokens * 2.4 / 1_000_000) +
    (estimatedOutputTokens * 9.6 / 1_000_000);

  const rows: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO podcasts (id, title, script, audio, news_ids, tts_model, tts_voice, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
    RETURNING id::text
  `, title, script, audioBuffer, newsIds, ttsModel, voice);

  const id = rows[0]?.id || 'unknown';

  return { id, title, script, newsIds, model, ttsModel, estimatedCostUsd };
}

export { getDefaultPodcastPrompt };
