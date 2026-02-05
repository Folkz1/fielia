import { prisma } from '@/lib/prisma';

export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export function formatProfileMessage(user: any) {
  if (!user) {
    return "❌ *Perfil não encontrado*\n\nNão consegui localizar seus dados. Tente enviar uma mensagem para se cadastrar!";
  }

  const now = new Date();
  const subscriptionEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  const isPremiumActive =
    Boolean(user.isPremium) && (!subscriptionEnd || subscriptionEnd > now);

  const premiumStatus = isPremiumActive ? "💎 *Premium*" : "🆓 *Grátis*";
  
  let message = `👤 *Seu Perfil Fiel*\n\n`;
  message += `*Nome:* ${user.name}\n`;
  message += `*Pontos Totais:* ${user.totalPoints} pts\n`;
  message += `*Sequência Atual:* ${user.currentStreak} dias 🔥\n`;
  message += `*Melhor Sequência:* ${user.maxStreak} dias\n`;
  message += `*Status:* ${premiumStatus}\n\n`;
  
  if (!isPremiumActive) {
    message += `Assine o Premium para ter acesso ilimitado e bônus de pontos! 🚀`;
  }

  return message.trim();
}
