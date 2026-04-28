import { prisma } from '@/lib/prisma';
import { isPremiumActive } from '@/lib/billing';

export type PremiumAccess = {
  isPremium: boolean;
  isAdmin: boolean;
  subscriptionEnd: Date | null;
};

export async function getPremiumAccess(userId: string): Promise<PremiumAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, isAdmin: true, subscriptionEnd: true },
  });

  if (!user) return { isPremium: false, isAdmin: false, subscriptionEnd: null };

  const active = isPremiumActive(user);
  if (!active && user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isPremium: false, subscriptionEnd: null },
    });
  }

  return {
    isPremium: active || user.isAdmin,
    isAdmin: user.isAdmin,
    subscriptionEnd: active ? user.subscriptionEnd : null,
  };
}

export async function isPremiumUser(userId: string) {
  const access = await getPremiumAccess(userId);
  return access.isPremium;
}
