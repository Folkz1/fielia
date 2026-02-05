import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';

export type LimitCheckResult = {
  allowed: boolean;
  message?: string;
  isPremium: boolean;
};

export async function checkUserLimit(whatsappId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { whatsappId },
  });

  if (!user) {
    // Should verify why user doesn't exist, but fallback to blocking to be safe
    // In reality, the webhook creates the user before calling this, so this case is rare
    return { allowed: false, message: 'Usuário não encontrado.', isPremium: false };
  }

  // 1. Premium Check
  const now = new Date();
  const isPremiumActive =
    user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now);

  if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, subscriptionEnd: null },
    });
  }

  if (isPremiumActive) {
    return { allowed: true, isPremium: true };
  }

  // 2. Daily Reset Logic
  const lastMessage = new Date(user.lastMessageDate);
  
  // Simple day check: if different day, reset
  // Using user's local time might be complex, so we stick to server time (UTC usually)
  // or simple date string comparison
  const isDifferentDay = now.toDateString() !== lastMessage.toDateString();

  if (isDifferentDay) {
    // Reset counter
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyMessageCount: 1, // Count this current message
        lastMessageDate: now,
      },
    });
    return { allowed: true, isPremium: false };
  }

  // 3. Limit Check
  if (user.dailyMessageCount >= 50) {
    return {
      allowed: false,
      isPremium: false,
      message: 'Seu limite diário acabou. Assine o Fiel Premium para continuar conversando!',
    };
  }

  // 4. Increment
  await prisma.user.update({
    where: { id: user.id },
    data: {
      dailyMessageCount: { increment: 1 },
      lastMessageDate: now,
    },
  });

  return { allowed: true, isPremium: false };
}
