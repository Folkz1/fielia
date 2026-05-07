import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

type SendResult = {
  target: string;
  kind: 'text' | 'image' | 'audio';
  ok: boolean;
  error?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: 'Admin access required', status: 403 as const };
  }

  return { userId: session.user.id };
}

function getGroupTarget() {
  return String(
    process.env.FIELIA_WHATSAPP_GROUP_ID ||
      process.env.WHATSAPP_ALLOWED_GROUP_IDS ||
      '120363422991914861@g.us'
  )
    .split(',')
    .map((item) => item.trim())
    .find(Boolean);
}

function getPublicBaseUrl(req: NextRequest) {
  const configured =
    process.env.FRONTEND_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL;
  if (configured) return configured.replace(/\/$/, '');

  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (forwardedHost && !forwardedHost.startsWith('0.0.0.0')) {
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
  }

  return req.nextUrl.origin.replace(/\/$/, '');
}

function getImageExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function getAudioExtension(file: File) {
  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt && /^[a-z0-9]{2,5}$/.test(nameExt)) return nameExt;
  if (file.type === 'audio/mpeg') return 'mp3';
  if (file.type === 'audio/ogg') return 'ogg';
  if (file.type === 'audio/wav') return 'wav';
  return 'mp3';
}

async function sendMediaSafely(input: {
  target: string;
  mediaUrl: string;
  kind: 'image' | 'audio';
  caption?: string;
  mimetype?: string;
  fileName?: string;
}): Promise<SendResult> {
  try {
    if (input.kind === 'audio') {
      await evolutionAPI.sendWhatsAppAudio({
        number: input.target,
        audioUrl: input.mediaUrl,
      });
    } else {
      await evolutionAPI.sendMediaMessage({
        number: input.target,
        mediaUrl: input.mediaUrl,
        caption: input.caption,
        mediatype: input.kind,
        mimetype: input.mimetype,
        fileName: input.fileName,
      });
    }
    return { target: input.target, kind: input.kind, ok: true };
  } catch (error) {
    return {
      target: input.target,
      kind: input.kind,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendTextSafely(target: string, text: string): Promise<SendResult> {
  try {
    await evolutionAPI.sendTextMessage({ number: target, text });
    return { target, kind: 'text', ok: true };
  } catch (error) {
    return {
      target,
      kind: 'text',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const [podcasts, images] = await Promise.all([
    prisma.podcast.findMany({
      where: { ttsModel: 'manual-upload' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        title: true,
        script: true,
        ttsVoice: true,
        createdAt: true,
      },
    }),
    prisma.meme.findMany({
      where: { prompt: 'manual-content-upload' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        caption: true,
        imageUrl: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ podcasts, images });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const form = await req.formData();
  const title = String(form.get('title') || '').trim();
  const caption = String(form.get('caption') || '').trim();
  const sendToGroup = String(form.get('sendToGroup') || 'false') === 'true';
  const sendToPremium = String(form.get('sendToPremium') || 'false') === 'true';
  const imageFile = form.get('image');
  const audioFile = form.get('audio');

  if (!title) {
    return NextResponse.json({ error: 'Titulo e obrigatorio' }, { status: 400 });
  }

  if (!caption) {
    return NextResponse.json({ error: 'Legenda e obrigatoria' }, { status: 400 });
  }

  if (!(imageFile instanceof File) && !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: 'Envie pelo menos uma imagem ou um audio' },
      { status: 400 }
    );
  }

  const publicBaseUrl = getPublicBaseUrl(req);
  const created: {
    image?: { id: string; imageUrl: string; absoluteUrl: string };
    podcast?: { id: string; audioUrl: string; absoluteUrl: string };
  } = {};

  if (imageFile instanceof File) {
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo de imagem invalido' }, { status: 400 });
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Imagem acima de 8 MB' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const ext = getImageExtension(imageFile);
    const filename = `manual-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const imageUrl = `/api/memes/image/${filename}`;

    const meme = await prisma.meme.create({
      data: {
        userId: admin.userId,
        prompt: 'manual-content-upload',
        caption,
        imageUrl,
        imageData: new Uint8Array(imageBuffer),
      },
      select: { id: true, imageUrl: true },
    });

    created.image = {
      id: meme.id,
      imageUrl: meme.imageUrl,
      absoluteUrl: `${publicBaseUrl}${meme.imageUrl}`,
    };
  }

  if (audioFile instanceof File) {
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Arquivo de audio invalido' }, { status: 400 });
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio acima de 30 MB' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const ext = getAudioExtension(audioFile);
    const podcast = await prisma.podcast.create({
      data: {
        title,
        script: caption,
        audio: new Uint8Array(audioBuffer),
        newsIds: [],
        ttsModel: 'manual-upload',
        ttsVoice: audioFile.type || ext,
      },
      select: { id: true },
    });

    const audioUrl = `/api/podcast/${podcast.id}/audio`;
    created.podcast = {
      id: podcast.id,
      audioUrl,
      absoluteUrl: `${publicBaseUrl}${audioUrl}`,
    };
  }

  const targets: string[] = [];
  if (sendToGroup) {
    const groupTarget = getGroupTarget();
    if (groupTarget) targets.push(groupTarget);
  }

  if (sendToPremium) {
    const premiumUsers = await prisma.user.findMany({
      where: {
        phone: { not: null },
        isPremium: true,
        OR: [{ subscriptionEnd: null }, { subscriptionEnd: { gt: new Date() } }],
      },
      select: { phone: true },
      take: 500,
    });
    targets.push(...premiumUsers.map((user) => user.phone).filter((phone): phone is string => Boolean(phone)));
  }

  const uniqueTargets = Array.from(new Set(targets));
  const sent: SendResult[] = [];

  for (const target of uniqueTargets) {
    if (created.image) {
      sent.push(
        await sendMediaSafely({
          target,
          kind: 'image',
          mediaUrl: created.image.absoluteUrl,
          caption,
          mimetype: imageFile instanceof File ? imageFile.type : undefined,
          fileName: `${title}.jpg`,
        })
      );
    } else {
      sent.push(await sendTextSafely(target, caption));
    }

    if (created.podcast) {
      sent.push(
        await sendMediaSafely({
          target,
          kind: 'audio',
          mediaUrl: created.podcast.absoluteUrl,
          mimetype: audioFile instanceof File ? audioFile.type : undefined,
          fileName: `${title}.${audioFile instanceof File ? getAudioExtension(audioFile) : 'mp3'}`,
        })
      );
    }
  }

  return NextResponse.json({
    success: true,
    created,
    sent,
    sendTargets: uniqueTargets.length,
  });
}
