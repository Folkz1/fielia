import { prisma } from '@/lib/prisma';
import { sendChatCompletion } from '@/lib/openrouter';
import { generateUniqueBlogSlug } from '@/lib/blog/slug';
import { hasBlogPostsTable } from '@/lib/db/postgres';

type GenerateBlogPostInput = {
  newsId: string;
  tone?: string;
  targetAudience?: string;
  extraInstruction?: string;
  forceRegenerate?: boolean;
  publish?: boolean;
};

type GeneratedBlogPayload = {
  title?: string;
  excerpt?: string;
  content_markdown?: string;
  category?: string;
  tags?: string[];
};

type GenerateBlogPostResult = {
  created: boolean;
  usedFallback: boolean;
  post: {
    id: string;
    slug: string;
    status: string;
    title: string;
  };
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}

function extractJsonFromText(text: string): GeneratedBlogPayload | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate =
    fenced ||
    text.match(/\{[\s\S]*\}/)?.[0] ||
    text;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') {
      return parsed as GeneratedBlogPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function buildFallbackPost(news: {
  title: string;
  summary: string;
  content: string;
  category: string;
  sourceUrl: string | null;
}) {
  const baseSummary = compactWhitespace(news.summary || news.title);
  const contentBase = compactWhitespace(news.content || news.summary || news.title);
  const title = `${news.title} | Analise para a Fiel`;
  const excerpt = truncate(baseSummary, 180);

  const lines = [
    `## O que aconteceu`,
    baseSummary,
    '',
    '## Por que isso importa para o Corinthians',
    truncate(contentBase, 900),
    '',
    '## Proximos passos',
    'Acompanhe os desdobramentos oficiais e os impactos esportivos para o elenco e para a temporada.',
  ];

  return {
    title: truncate(title, 140),
    excerpt,
    content: lines.join('\n'),
    category: news.category || 'Geral',
  };
}

function buildPrompt(input: {
  title: string;
  summary: string;
  content: string;
  category: string;
  sourceUrl: string | null;
  tone: string;
  targetAudience: string;
  extraInstruction?: string;
}) {
  const system = [
    'Voce e editor da FIEL.IA e escreve para torcedores do Corinthians.',
    'Reescreva a noticia em formato de blog post original, sem copiar blocos literais longos da fonte.',
    'Mantenha fatos e contexto. Nao invente dados ou citacoes.',
    'Escreva em portugues brasileiro.',
    `Tom editorial: ${input.tone}.`,
    `Publico-alvo: ${input.targetAudience}.`,
    'Estrutura sugerida: resumo inicial, contexto, impactos para a torcida, conclusao.',
    'Retorne APENAS JSON valido neste formato:',
    '{"title":"", "excerpt":"", "content_markdown":"", "category":"", "tags":["",""]}',
    'content_markdown deve vir em Markdown simples, com subtitulos e paragrafos curtos.',
  ].join('\n');

  const user = [
    `Titulo original: ${input.title}`,
    `Categoria original: ${input.category}`,
    `Resumo original: ${input.summary}`,
    `Conteudo original: ${truncate(input.content, 5000)}`,
    input.sourceUrl ? `URL da fonte: ${input.sourceUrl}` : 'URL da fonte: nao informada',
    input.extraInstruction ? `Instrucao extra: ${input.extraInstruction}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export async function generateBlogPostFromNews(
  input: GenerateBlogPostInput
): Promise<GenerateBlogPostResult> {
  const tone = input.tone || process.env.BLOG_DEFAULT_TONE || 'informativo e envolvente';
  const targetAudience =
    input.targetAudience || process.env.BLOG_TARGET_AUDIENCE || 'torcedores do Corinthians';
  const publish = input.publish ?? true;

  const blogPostsReady = await hasBlogPostsTable();
  if (!blogPostsReady) {
    throw new Error(
      'Blog is not initialized (table public.blog_posts is missing). Run `npx prisma db push` or `npx prisma migrate deploy` against your DATABASE_URL.'
    );
  }

  const news = await prisma.news.findUnique({
    where: { id: input.newsId },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      category: true,
      imageUrl: true,
      sourceUrl: true,
      publishedAt: true,
    },
  });

  if (!news) {
    throw new Error('News not found');
  }

  const existingPost = await prisma.blogPost.findUnique({
    where: { newsId: news.id },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  if (existingPost && !input.forceRegenerate) {
    return {
      created: false,
      usedFallback: false,
      post: {
        id: existingPost.id,
        slug: existingPost.slug,
        status: existingPost.status,
        title: news.title,
      },
    };
  }

  const prompt = buildPrompt({
    title: news.title,
    summary: news.summary,
    content: news.content,
    category: news.category,
    sourceUrl: news.sourceUrl,
    tone,
    targetAudience,
    extraInstruction: input.extraInstruction,
  });

  let aiPayload: GeneratedBlogPayload | null = null;
  let usedFallback = false;

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const model = process.env.OPENROUTER_BLOG_MODEL || process.env.OPENROUTER_MODEL;
      const response = await sendChatCompletion(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { temperature: 0.5, maxTokens: 1600, model }
      );

      aiPayload = extractJsonFromText(response.content || '');
    } catch (error) {
      console.warn('Blog generation fallback (OpenRouter failed):', error);
    }
  }

  const fallback = buildFallbackPost(news);
  if (!aiPayload) {
    usedFallback = true;
  }

  const title = truncate(
    compactWhitespace(aiPayload?.title || fallback.title || news.title),
    140
  );
  const excerpt = truncate(
    compactWhitespace(aiPayload?.excerpt || fallback.excerpt || news.summary || news.title),
    220
  );
  const content = (aiPayload?.content_markdown || fallback.content || news.summary).trim();
  const category = truncate(
    compactWhitespace(aiPayload?.category || news.category || 'Geral'),
    50
  );

  const slug = existingPost?.slug || (await generateUniqueBlogSlug(title, news.id));
  const status = publish ? 'PUBLISHED' : existingPost?.status || 'DRAFT';
  const publishedAt =
    status === 'PUBLISHED'
      ? existingPost?.publishedAt || new Date()
      : null;

  const payload = {
    newsId: news.id,
    slug,
    title,
    excerpt,
    content,
    category,
    coverImageUrl: news.imageUrl,
    sourceTitle: news.title,
    sourceUrl: news.sourceUrl,
    sourcePublishedAt: news.publishedAt,
    tone,
    targetAudience,
    status,
    publishedAt,
    generatedPrompt: prompt.system,
  };

  const post = existingPost
    ? await prisma.blogPost.update({
        where: { id: existingPost.id },
        data: payload,
        select: { id: true, slug: true, status: true, title: true },
      })
    : await prisma.blogPost.create({
        data: payload,
        select: { id: true, slug: true, status: true, title: true },
      });

  return {
    created: !existingPost,
    usedFallback,
    post,
  };
}

export async function generateBlogPostsFromLatestNews(options?: {
  limit?: number;
  tone?: string;
  targetAudience?: string;
  publish?: boolean;
}) {
  const blogPostsReady = await hasBlogPostsTable();
  if (!blogPostsReady) {
    throw new Error(
      'Blog is not initialized (table public.blog_posts is missing). Run `npx prisma db push` or `npx prisma migrate deploy` against your DATABASE_URL.'
    );
  }

  const limit = Math.max(1, Math.min(options?.limit || 5, 30));

  const poolSize = Math.min(120, limit * 6);
  const pool = await prisma.news.findMany({
    orderBy: { publishedAt: 'desc' },
    take: poolSize,
    select: { id: true },
  });

  const existing = await prisma.blogPost.findMany({
    where: { newsId: { in: pool.map((item) => item.id) } },
    select: { newsId: true },
  });
  const existingIds = new Set(existing.map((item) => item.newsId).filter(Boolean) as string[]);

  const candidates = pool.filter((item) => !existingIds.has(item.id)).slice(0, limit);

  const results: GenerateBlogPostResult[] = [];
  for (const candidate of candidates) {
    const result = await generateBlogPostFromNews({
      newsId: candidate.id,
      tone: options?.tone,
      targetAudience: options?.targetAudience,
      publish: options?.publish,
    });
    results.push(result);
  }

  return {
    requested: limit,
    processed: candidates.length,
    created: results.filter((item) => item.created).length,
    reused: results.filter((item) => !item.created).length,
    fallbackCount: results.filter((item) => item.usedFallback).length,
    results,
  };
}
