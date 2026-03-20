import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asaasClient } from "@/lib/asaas";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const runtime = "nodejs";

function formatAsaasDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function generatePassword() {
  return crypto.randomBytes(9).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, cpf } = body as {
      name?: string;
      email?: string;
      phone?: string;
      cpf?: string;
    };

    // Validação
    if (!name || !email || !cpf || !phone) {
      return NextResponse.json(
        { error: "Nome, email, CPF e WhatsApp são obrigatórios." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      return NextResponse.json(
        { error: "CPF deve conter 11 dígitos." },
        { status: 400 }
      );
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 }
      );
    }

    // Verificar se já é assinante ativo
    const now = new Date();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
      },
    });

    if (existing?.isPremium) {
      const isActive =
        !existing.subscriptionEnd || existing.subscriptionEnd > now;
      if (isActive) {
        return NextResponse.json(
          { error: "Este email já possui uma assinatura Premium ativa." },
          { status: 409 }
        );
      }
    }

    // Criar ou reutilizar usuário
    let userId: string;
    let asaasCustomerId: string | null = existing?.asaasCustomerId || null;

    if (existing) {
      // Atualizar dados se necessário
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          phone: phoneDigits || undefined,
          cpfCnpj: cpfDigits || undefined,
        },
      });
      userId = existing.id;
    } else {
      // Criar novo usuário
      const hashedPassword = await bcrypt.hash(generatePassword(), 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          phone: phoneDigits,
          cpfCnpj: cpfDigits,
          password: hashedPassword,
        },
      });
      userId = newUser.id;
    }

    // Criar customer no Asaas (ou reutilizar)
    if (!asaasCustomerId) {
      const customer = await asaasClient.createCustomer({
        name,
        email,
        cpfCnpj: cpfDigits,
        mobilePhone: phoneDigits,
      });
      asaasCustomerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId },
      });
    }

    // Criar subscription com UNDEFINED billing (usuário escolhe forma de pagamento)
    // nextDueDate é amanhã para garantir que o pagamento seja gerado imediatamente
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDueDate = formatAsaasDate(tomorrow);
    const planValue = Number(process.env.ASAAS_SUBSCRIPTION_VALUE || "56.90");

    const subscription = await asaasClient.createSubscription({
      customer: asaasCustomerId!,
      billingType: "UNDEFINED",
      value: planValue,
      nextDueDate,
      cycle: "MONTHLY",
      description: "FIEL.IA Premium Mensal",
      externalReference: `user:${userId}`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { asaasSubscriptionId: subscription.id },
    });

    // Buscar primeiro pagamento para obter invoiceUrl (com retry)
    let invoiceUrl: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const paymentsResponse = await asaasClient.listSubscriptionPayments(
          subscription.id
        );
        const firstPayment = paymentsResponse?.data?.[0];
        invoiceUrl = firstPayment?.invoiceUrl || null;
        if (invoiceUrl) break;
      } catch (err) {
        console.warn(`[Checkout] Tentativa ${attempt + 1} - Não foi possível buscar invoiceUrl:`, err);
      }
      // Aguardar 500ms antes do próximo retry
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }

    if (!invoiceUrl) {
      console.error("[Checkout] invoiceUrl não retornado após 3 tentativas. subscription.id:", subscription.id);
      return NextResponse.json(
        { error: "Não foi possível gerar o link de pagamento. Tente novamente em alguns instantes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceUrl });
  } catch (error: any) {
    console.error("[Checkout] Erro:", error?.message || error);

    // Tratar erros do Asaas com mensagens amigáveis
    const msg: string = error?.message || "";
    const asaasErrors: Array<{ code?: string; description?: string }> = error?.asaasErrors || [];
    const firstAsaasError = asaasErrors[0];

    if (firstAsaasError?.code === 'invalid_object' && firstAsaasError?.description?.toLowerCase().includes('cpf')) {
      return NextResponse.json(
        { error: "CPF inválido. Verifique os dados e tente novamente." },
        { status: 400 }
      );
    }

    if (msg.includes("cpfCnpj") || msg.toLowerCase().includes("cpf")) {
      return NextResponse.json(
        { error: "CPF inválido ou já cadastrado no sistema de pagamento." },
        { status: 400 }
      );
    }
    if (msg.includes("email") && msg.includes("400")) {
      return NextResponse.json(
        { error: "Email inválido ou já cadastrado." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao processar checkout. Tente novamente." },
      { status: 500 }
    );
  }
}
