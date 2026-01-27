import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'teste@fiel.ia' },
    });

    if (existingUser) {
      console.log('✅ Usuário de teste já existe!');
      console.log('\n📧 Email: teste@fiel.ia');
      console.log('🔑 Senha: fiel123');
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('fiel123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'teste@fiel.ia',
        name: 'Fiel Torcedor',
        password: hashedPassword,
        phone: '+5511999999999',
        isPremium: true,
        totalPoints: 150,
        currentStreak: 7,
        maxStreak: 10,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    console.log('✅ Usuário de teste criado com sucesso!');
    console.log('\n🎉 Credenciais de acesso:');
    console.log('📧 Email: teste@fiel.ia');
    console.log('🔑 Senha: fiel123');
    console.log('\n💎 Status: Premium (30 dias)');
    console.log(`📊 Pontos: ${user.totalPoints}`);
    console.log(`🔥 Streak: ${user.currentStreak} dias`);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
