import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false", // default true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #333;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a);padding:40px 40px 30px;text-align:center;border-bottom:1px solid #222;">
            <div style="font-size:36px;margin-bottom:8px;">⚫⚪</div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px;">FIEL.IA</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Recuperar senha</h2>
            <p style="color:#aaa;line-height:1.7;margin:0 0 24px;font-size:15px;">
              Oi ${name}, recebemos uma solicitação para redefinir sua senha.
              Clique no botão abaixo para criar uma nova senha:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#000;font-size:16px;font-weight:bold;padding:16px 40px;border-radius:8px;text-decoration:none;">
                  Redefinir senha
                </a>
              </td></tr>
            </table>
            <p style="color:#666;font-size:13px;text-align:center;">
              Este link expira em 1 hora. Se você não solicitou, ignore este email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;">
            <p style="color:#444;font-size:11px;margin:0;">© 2026 FIEL.IA — fielchat.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"FIEL.IA" <suporte@fielchat.com>',
    to,
    subject: "Redefinir sua senha — FIEL.IA",
    html,
  });
}

export async function sendMagicLinkEmail({
  to,
  name,
  magicUrl,
}: {
  to: string;
  name: string;
  magicUrl: string;
}) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bem-vindo ao FIEL.IA Premium</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #333;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a);padding:40px 40px 30px;text-align:center;border-bottom:1px solid #222;">
              <div style="font-size:36px;margin-bottom:8px;">⚫⚪</div>
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px;">FIEL.IA</h1>
              <p style="color:#888;margin:8px 0 0;font-size:14px;letter-spacing:1px;">INTELIGÊNCIA ARTIFICIAL DO CORINTHIANS</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">
                🎉 Bem-vindo ao Premium, ${name}!
              </h2>
              <p style="color:#aaa;line-height:1.7;margin:0 0 24px;font-size:15px;">
                Sua assinatura foi confirmada com sucesso! Você agora tem acesso completo
                ao FIEL.IA Premium — a IA mais apaixonada pelo Corinthians.
              </p>

              <!-- Magic Link Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td align="center">
                    <a href="${magicUrl}" style="display:inline-block;background:#fff;color:#000;font-size:16px;font-weight:bold;padding:16px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                      ✅ Acessar FIEL.IA Agora
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#666;font-size:13px;text-align:center;margin:0 0 32px;">
                Este link expira em 15 minutos. Clique para entrar automaticamente.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #222;margin:32px 0;" />

              <!-- WhatsApp -->
              <h3 style="color:#fff;margin:0 0 12px;font-size:16px;">💬 Acesse também pelo WhatsApp</h3>
              <p style="color:#aaa;line-height:1.7;margin:0 0 16px;font-size:14px;">
                Converse com a IA do Corinthians diretamente pelo WhatsApp! Envie qualquer
                mensagem para o número abaixo e o FIEL.IA responderá com análises,
                estatísticas e muito mais.
              </p>
              <p style="color:#aaa;font-size:14px;margin:0 0 8px;">
                📱 <strong style="color:#fff;">WhatsApp:</strong> Verifique no painel do app após acessar
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #222;margin:32px 0;" />

              <!-- Plan Summary -->
              <h3 style="color:#fff;margin:0 0 16px;font-size:16px;">📋 Resumo do seu plano</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;color:#aaa;font-size:14px;border-bottom:1px solid #1a1a1a;">Plano</td>
                  <td style="padding:10px 0;color:#fff;font-size:14px;font-weight:bold;text-align:right;border-bottom:1px solid #1a1a1a;">Premium Mensal</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#aaa;font-size:14px;border-bottom:1px solid #1a1a1a;">Valor</td>
                  <td style="padding:10px 0;color:#fff;font-size:14px;font-weight:bold;text-align:right;border-bottom:1px solid #1a1a1a;">R$ 56,90/mês</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#aaa;font-size:14px;">Acesso</td>
                  <td style="padding:10px 0;color:#4ade80;font-size:14px;font-weight:bold;text-align:right;">✅ Ativo</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;">
              <p style="color:#555;font-size:12px;margin:0 0 8px;">
                Se você não solicitou esta assinatura, entre em contato conosco.
              </p>
              <p style="color:#444;font-size:11px;margin:0;">
                © 2026 FIEL.IA — fielchat.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"FIEL.IA" <suporte@fielchat.com>',
    to,
    subject: "🎉 Bem-vindo ao FIEL.IA Premium! Acesse aqui",
    html,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://fielchat.com"}/auth/login`;
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #333;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a);padding:40px 40px 30px;text-align:center;border-bottom:1px solid #222;">
            <div style="font-size:36px;margin-bottom:8px;">⚫⚪</div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px;">FIEL.IA</h1>
            <p style="color:#888;margin:8px 0 0;font-size:14px;letter-spacing:1px;">INTELIGÊNCIA ARTIFICIAL DO CORINTHIANS</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">
              Bem-vindo à Fiel Torcida Digital, ${name}! 🦅
            </h2>
            <p style="color:#aaa;line-height:1.7;margin:0 0 24px;font-size:15px;">
              Sua conta foi criada com sucesso! Agora você faz parte da comunidade FIEL.IA —
              a inteligência artificial mais apaixonada pelo Corinthians.
            </p>

            <h3 style="color:#fff;margin:0 0 12px;font-size:16px;">O que você pode fazer:</h3>
            <ul style="color:#aaa;line-height:2;font-size:14px;padding-left:20px;margin:0 0 24px;">
              <li>💬 Conversar com a IA sobre o Timão</li>
              <li>📰 Acompanhar notícias verificadas</li>
              <li>🏆 Participar dos quizzes semanais</li>
              <li>😂 Gerar memes com IA</li>
              <li>👑 Subir no ranking da Fiel Torcida</li>
            </ul>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr><td align="center">
                <a href="${loginUrl}" style="display:inline-block;background:#fff;color:#000;font-size:16px;font-weight:bold;padding:16px 40px;border-radius:8px;text-decoration:none;">
                  Acessar FIEL.IA
                </a>
              </td></tr>
            </table>

            <hr style="border:none;border-top:1px solid #222;margin:32px 0;" />

            <p style="color:#aaa;line-height:1.7;margin:0;font-size:14px;">
              💬 Você também pode conversar com a FIEL.IA pelo WhatsApp!
              Envie "Oi" para <strong style="color:#fff;">(11) 98212-9134</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;">
            <p style="color:#444;font-size:11px;margin:0;">© 2026 FIEL.IA — fielchat.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"FIEL.IA" <suporte@fielchat.com>',
    to,
    subject: "Bem-vindo à FIEL.IA! 🦅 Sua conta foi criada",
    html,
  });
}
