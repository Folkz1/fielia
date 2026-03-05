import { sendChatCompletion } from '@/lib/openrouter';
import { prisma } from '@/lib/prisma';

const TTS_VOICE = process.env.TTS_VOICE || 'nova';

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
}

function getDefaultPodcastPrompt(): string {
  return `Voce e o narrador do podcast "Voz da Fiel" - o podcast diario da torcida do Corinthians.

ESTILO:
- Fale como torcedor apaixonado do Corinthians numa mesa de bar
- Use girias: "mano", "cria", "maluco", "e nois", "vai corinthians"
- Transmita EMOCAO - vibre com boas noticias, sofra com as ruins
- Tom de conversa entre amigos, nao de jornalista
- Paragrafos curtos, frases diretas

ESTRUTURA:
1. Abertura (1-2 frases): Saudacao energetica, "E ai Fiel! Aqui e o Voz da Fiel..."
2. Noticias (1 paragrafo cada): Conte cada noticia com emocao e opiniao
3. Encerramento (1-2 frases): Mensagem motivacional pro torcedor, "Vai Corinthians!"

REGRAS:
- NUNCA invente fatos - use SOMENTE o que esta nas noticias
- Nao mencione fontes ou sites
- Maximo 2000 caracteres total (ideal para 2-3 minutos de audio)
- Escreva como texto corrido para ser NARRADO em voz alta (sem marcadores, sem bullets)
- Nao use emojis (e audio, nao texto)`;
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
    return `NOTICIA ${i + 1}: ${n.title}\n${n.content.slice(0, 1500)}`;
  }).join('\n\n---\n\n');

  const model = process.env.OPENROUTER_MODEL;
  const response = await sendChatCompletion(
    [
      { role: 'system', content: prompt },
      { role: 'user', content: `Gere o roteiro do podcast de hoje com base nestas noticias:\n\n${newsText}` },
    ],
    { temperature: 0.7, maxTokens: 1500, model }
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
  const model = process.env.TTS_MODEL || 'openai/gpt-audio-mini';

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
          content: 'Voce e um narrador. Sua UNICA funcao e ler em voz alta EXATAMENTE o texto que o usuario enviar. NAO responda, NAO comente, NAO adicione nada. Apenas leia o texto palavra por palavra com boa entonacao, energia e emocao.',
        },
        {
          role: 'user',
          content: `Leia este texto em voz alta agora: ${text.slice(0, 4096)}`,
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

  // Convert PCM16 raw to WAV (24kHz mono 16-bit)
  return pcm16ToWav(pcmBuffer);
}

export async function generatePodcast(news: NewsItem[]): Promise<PodcastResult> {
  if (!news.length) throw new Error('Nenhuma noticia para gerar podcast');

  // 1. Gerar script narrado
  const { script, model } = await generatePodcastScript(news);

  // 2. Gerar audio
  const audioBuffer = await generateAudio(script);

  // 3. Salvar no banco
  const today = new Date().toISOString().split('T')[0];
  const title = `Voz da Fiel - ${today}`;
  const newsIds = news.map(n => n.id);
  const voice = await getPodcastVoice();
  const ttsModel = process.env.TTS_MODEL || 'openai/gpt-audio-mini';

  // Usar $queryRawUnsafe para pegar o id de volta
  const rows: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO podcasts (id, title, script, audio, news_ids, tts_model, tts_voice, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
    RETURNING id::text
  `, title, script, audioBuffer, newsIds, ttsModel, voice);

  const id = rows[0]?.id || 'unknown';

  return { id, title, script, newsIds, model };
}

export { getDefaultPodcastPrompt };
