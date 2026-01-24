
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    const news = await prisma.news.findMany({ take: 5 });
    console.log('News fetched successfully:', news);
  } catch (error) {
    console.error('Error fetching news:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
