import { prisma } from '@/lib/prisma';

function normalizeToSlug(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createBaseSlug(title: string, fallbackId?: string) {
  const normalized = normalizeToSlug(title);
  if (normalized) return normalized.slice(0, 80);
  if (fallbackId) return `post-${fallbackId}`;
  return `post-${Date.now()}`;
}

export async function generateUniqueBlogSlug(title: string, fallbackId?: string) {
  const base = createBaseSlug(title, fallbackId);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}
