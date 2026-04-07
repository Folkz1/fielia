#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TO_EMAIL = 'diegovilson.1999@gmail.com';
const TEST_MAGIC_URL = 'https://fielchat.com/api/auth/magic/TEST_TOKEN_DIAGNOSTICO';

async function main() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465');
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"FIEL.IA" <suporte@fielchat.com>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'NÃO CONFIGURADO';

  console.log('[SMTP Test] Configuração detectada:');
  console.log(`  SMTP_HOST: ${host || 'NÃO CONFIGURADO'}`);
  console.log(`  SMTP_PORT: ${port}`);
  console.log(`  SMTP_SECURE: ${secure}`);
  console.log(`  SMTP_USER: ${user || 'NÃO CONFIGURADO'}`);
  console.log(`  SMTP_PASS: ${pass ? '****' + pass.slice(-3) : 'NÃO CONFIGURADO'}`);
  console.log(`  NEXT_PUBLIC_APP_URL: ${appUrl}`);
  console.log('');

  if (!host || !user || !pass) {
    throw new Error('Variáveis SMTP ausentes no .env (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

  console.log('[1/2] Verificando conexão SMTP...');
  await transporter.verify();
  console.log('  OK: Conexão SMTP estabelecida');

  console.log(`[2/2] Enviando email de diagnóstico para ${TO_EMAIL}...`);
  const info = await transporter.sendMail({
    from,
    to: TO_EMAIL,
    subject: '[FIEL.IA] Teste SMTP — Diagnóstico Magic Link',
    html: `
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:32px;">
  <h2>Teste SMTP — FIEL.IA</h2>
  <p>Este é um email de diagnóstico. Se você recebeu este email, o SMTP está funcionando.</p>
  <hr style="border-color:#333;"/>
  <p><strong>NEXT_PUBLIC_APP_URL configurado:</strong> ${appUrl}</p>
  <p><strong>Magic Link de exemplo:</strong></p>
  <a href="${TEST_MAGIC_URL}" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:6px;font-weight:bold;text-decoration:none;margin-top:8px;">
    ✅ Acessar FIEL.IA Agora (teste)
  </a>
  <p style="margin-top:24px;color:#888;font-size:12px;">Enviado em: ${new Date().toISOString()}</p>
</body>`,
  });

  console.log(`  OK: Email enviado — messageId: ${info.messageId}`);
  console.log('');
  console.log('Resultado: SMTP funcionando. Verifique se o botão no email aponta para fielchat.com (não localhost).');

  if (appUrl.includes('localhost')) {
    console.warn('');
    console.warn('⚠️  ATENÇÃO: NEXT_PUBLIC_APP_URL está apontando para localhost!');
    console.warn('   Em produção (EasyPanel), configure: NEXT_PUBLIC_APP_URL=https://fielchat.com');
  }
}

main().catch((error) => {
  console.error('\nFalha no teste SMTP:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
