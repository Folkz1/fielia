"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, AlertTriangle, Palette } from "lucide-react";
import { useSubscription } from "@/hooks/use-api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ThemeSelector } from "@/lib/theme-context";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  });

function formatCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function SettingsPageInner() {
  const { createSubscription, cancelSubscription, isProcessing } = useSubscription();
  const searchParams = useSearchParams();
  const shouldAutoSubscribe = searchParams.get("subscribe") === "1";
  const autoSubscribeStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cpfInput, setCpfInput] = useState("");
  const [needsCpf, setNeedsCpf] = useState(false);
  const [savingCpf, setSavingCpf] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    status?: string | null;
    dueDate?: string | null;
    invoiceUrl?: string | null;
    reusedSubscription?: boolean;
    billingType?: string | null;
  } | null>(null);

  const { data, mutate, isLoading } = useSWR("/api/subscription", fetcher, {
    revalidateOnFocus: false,
  });

  const isPremium = Boolean(data?.isPremium);
  const userId = data?.userId || "";
  const subscriptionEnd = data?.subscriptionEnd ? new Date(data.subscriptionEnd) : null;

  const handleSubscribe = useCallback(async (cpf?: string) => {
    try {
      setErrorMessage(null);
      const result = await createSubscription(cpf);

      // Redirect to Asaas hosted checkout/invoice page
      if (result?.invoiceUrl) {
        window.location.href = result.invoiceUrl as string;
        return;
      }

      setNeedsCpf(false);
      setPaymentInfo({
        status: result?.status || null,
        dueDate: result?.dueDate || null,
        invoiceUrl: result?.invoiceUrl || null,
        billingType: result?.billingType || null,
        reusedSubscription: Boolean(result?.reusedSubscription),
      });
      await mutate();
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Falha ao criar assinatura";
      setErrorMessage(msg);
      // Se o erro for de CPF, mostrar formulário inline
      if (msg.toLowerCase().includes("cpf")) {
        setNeedsCpf(true);
      }
    }
  }, [createSubscription, mutate]);

  const handleCpfSubmit = async () => {
    const cpf = cpfInput.replace(/\D/g, "");
    if (cpf.length !== 11) {
      setErrorMessage("CPF inválido. Digite os 11 dígitos.");
      return;
    }
    setSavingCpf(true);
    try {
      // Salva o CPF no perfil e já tenta assinar
      await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCnpj: cpf }),
      });
      await handleSubscribe(cpf);
    } finally {
      setSavingCpf(false);
    }
  };

  useEffect(() => {
    if (!shouldAutoSubscribe) return;
    if (autoSubscribeStartedRef.current) return;
    if (!userId) return;
    if (isPremium) return;
    if (isProcessing || isLoading) return;

    autoSubscribeStartedRef.current = true;
    void handleSubscribe();
  }, [shouldAutoSubscribe, userId, isPremium, isProcessing, isLoading, handleSubscribe]);

  const handleCancel = async () => {
    try {
      setErrorMessage(null);
      await cancelSubscription();
      setPaymentInfo(null);
      await mutate();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Falha ao cancelar assinatura");
    }
  };

  return (
    <div className="p-8 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-4xl font-heading text-white mb-8">Configurações & Assinatura ⚙️</h1>

      <div className="grid gap-8">
        {/* Theme Selector Card */}
        <Card className="bg-corinthians-gray-dark border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Aparência
            </CardTitle>
            <CardDescription className="text-gray-400">
              Personalize as cores do app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={`border-2 transition-all ${isPremium ? 'border-[var(--gradient-accent-start)] bg-[var(--gradient-accent-start)]/10' : 'border-gray-800 bg-corinthians-gray-dark'}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Crown className={`w-6 h-6 ${isPremium ? 'text-[var(--gradient-accent-start)]' : 'text-gray-500'}`} />
                  Plano Fiel Torcedor Digital
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Tenha acesso exclusivo a recursos premium
                </CardDescription>
              </div>
              {isPremium ? (
                <Badge className="badge-accent">ATIVO</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-400 border-gray-600">INATIVO</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {paymentInfo && !isPremium && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100 space-y-2">
                <p>
                  {paymentInfo.reusedSubscription
                    ? "Você já tinha uma cobrança pendente. Reutilizamos a assinatura existente."
                    : "Assinatura criada. Pagamento pendente de confirmação."}
                </p>
                <p>Método de cobrança: Cartão de crédito</p>
                {paymentInfo.status && <p>Status: {paymentInfo.status}</p>}
                {paymentInfo.dueDate && (
                  <p>Vencimento: {new Date(paymentInfo.dueDate).toLocaleDateString("pt-BR")}</p>
                )}
                {paymentInfo.invoiceUrl && (
                  <a
                    href={paymentInfo.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20"
                  >
                    Abrir checkout de pagamento
                  </a>
                )}
              </div>
            )}

            {isPremium ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                  <Check className="text-green-500 w-5 h-5" />
                  <p className="text-green-400 text-sm">
                    {subscriptionEnd
                      ? `Sua assinatura está ativa e renova em ${subscriptionEnd.toLocaleDateString('pt-BR')}.`
                      : "Sua assinatura está ativa."}
                  </p>
                </div>
                
                <div className="space-y-2 text-gray-300">
                  <p className="font-semibold text-white">Seus Benefícios:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Sem anúncios no app</li>
                    <li>Acesso ilimitado ao Chat IA</li>
                    <li>Participação em sorteios exclusivos</li>
                    <li>Badge PRO no ranking</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel}
                    disabled={isProcessing || isLoading}
                  >
                    {isProcessing ? <LoadingSpinner size="sm" /> : "Cancelar Assinatura"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <p className="text-3xl font-bold text-white mb-2">R$ 56,90<span className="text-sm text-gray-400 font-normal">/mês</span></p>
                     <p className="text-[var(--gradient-accent-start)] text-sm font-semibold mb-4">7 dias grátis para novos assinantes!</p>
                     
                     <ul className="space-y-2">
                       {[
                         "Inteligência Artificial Ilimitada",
                         "Sem anúncios",
                         "Sorteios de Camisas Oficiais",
                         "Badge Exclusiva de Apoiador"
                       ].map((item, i) => (
                         <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                           <Check className="w-4 h-4 text-[var(--gradient-accent-start)]" /> {item}
                         </li>
                       ))}
                     </ul>
                   </div>
                   
                   <div className="bg-black/30 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                     <Crown className="w-12 h-12 text-[var(--gradient-accent-start)] mb-3" />
                     <p className="text-white font-semibold mb-1">Seja Fiel de verdade!</p>
                     <p className="text-xs text-gray-400 mb-4">Apoie o desenvolvimento e ganhe vantagens.</p>

                     {needsCpf ? (
                       <div className="w-full space-y-2">
                         <p className="text-xs text-yellow-400 font-medium">Informe seu CPF para continuar:</p>
                         <input
                           type="text"
                           inputMode="numeric"
                           value={cpfInput}
                           onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                           placeholder="000.000.000-00"
                           className="w-full rounded-lg border border-gray-600 bg-black/40 px-3 py-2 text-center text-white text-sm focus:outline-none focus:border-yellow-500"
                         />
                         <Button
                           className="w-full btn-primary"
                           onClick={handleCpfSubmit}
                           disabled={isProcessing || savingCpf || cpfInput.replace(/\D/g, "").length !== 11}
                         >
                           {isProcessing || savingCpf ? <LoadingSpinner size="sm" /> : "Confirmar e Assinar"}
                         </Button>
                       </div>
                     ) : (
                       <Button
                         className="w-full btn-primary"
                         onClick={() => handleSubscribe()}
                         disabled={isProcessing || isLoading}
                       >
                         {isProcessing ? <LoadingSpinner size="sm" /> : "Assinar no Cartão"}
                       </Button>
                     )}
                     <p className="text-[10px] text-gray-500 mt-2">Cancelamento a qualquer momento.</p>
                   </div>
                 </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Info */}
        <Card className="bg-corinthians-gray-dark border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Nome</label>
                <p className="text-gray-300">{data?.name || "Carregando..."}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">ID</label>
                <p className="text-gray-300 font-mono text-xs">{userId || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Email</label>
                <p className="text-gray-300">{data?.email || "Carregando..."}</p>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 items-start">
               <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
               <p className="text-xs text-yellow-500">Para alterar seus dados, entre em contato com o suporte através do WhatsApp.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={(<div className="p-8 flex justify-center"><LoadingSpinner /></div>)}>
      <SettingsPageInner />
    </Suspense>
  );
}
