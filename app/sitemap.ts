import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fielchat.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/assinar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/termos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidade`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/contato`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });

    blogPages = posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB might not be available at build time
  }

  return [...staticPages, ...blogPages];
}
