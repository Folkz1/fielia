"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function SettingsPage() {
  const { createSubscription, cancelSubscription, isProcessing } = useSubscription();
  const [isPremium, setIsPremium] = useState(false); // In real app, fetch from user context
  const [userId] = useState("mock-user-id"); // In real app, fetch from auth

  const handleSubscribe = async () => {
    try {
      await createSubscription(userId);
      setIsPremium(true);
      // Show success toast
    } catch (error) {
      console.error(error);
      // Show error toast
    }
  };

  const handleCancel = async () => {
    try {
      await cancelSubscription(userId);
      setIsPremium(false);
      // Show success toast
    } catch (error) {
      console.error(error);
      // Show error toast
    }
  };

  return (
    <div className="p-8 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-4xl font-heading text-white mb-8">Configurações & Assinatura ⚙️</h1>

      <div className="grid gap-8">
        {/* Subscription Card */}
        <Card className={`border-2 transition-all ${isPremium ? 'border-corinthians-gold bg-corinthians-gold/10' : 'border-gray-800 bg-corinthians-gray-dark'}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Crown className={`w-6 h-6 ${isPremium ? 'text-corinthians-gold' : 'text-gray-500'}`} />
                  Plano Fiel Torcedor Digital
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Tenha acesso exclusivo a recursos premium
                </CardDescription>
              </div>
              {isPremium ? (
                <Badge className="bg-corinthians-gold text-black hover:bg-yellow-500">ATIVO</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-400 border-gray-600">INATIVO</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPremium ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                  <Check className="text-green-500 w-5 h-5" />
                  <p className="text-green-400 text-sm">Sua assinatura está ativa e renova em 19/02/2026.</p>
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
                    disabled={isProcessing}
                  >
                    {isProcessing ? <LoadingSpinner size="sm" /> : "Cancelar Assinatura"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <p className="text-3xl font-bold text-white mb-2">R$ 9,90<span className="text-sm text-gray-400 font-normal">/mês</span></p>
                     <p className="text-corinthians-gold text-sm font-semibold mb-4">7 dias grátis para novos assinantes!</p>
                     
                     <ul className="space-y-2">
                       {[
                         "Inteligência Artificial Ilimitada",
                         "Sem anúncios",
                         "Sorteios de Camisas Oficiais",
                         "Badge Exclusiva de Apoiador"
                       ].map((item, i) => (
                         <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                           <Check className="w-4 h-4 text-corinthians-gold" /> {item}
                         </li>
                       ))}
                     </ul>
                   </div>
                   
                   <div className="bg-black/30 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                     <Crown className="w-12 h-12 text-corinthians-gold mb-3" />
                     <p className="text-white font-semibold mb-1">Seja Fiel de verdade!</p>
                     <p className="text-xs text-gray-400 mb-4">Apoie o desenvolvimento e ganhe vantagens.</p>
                     <Button 
                       className="w-full bg-gradient-gold text-black hover:brightness-110"
                       onClick={handleSubscribe}
                       disabled={isProcessing}
                     >
                       {isProcessing ? <LoadingSpinner size="sm" className="text-black" /> : "Assinar Agora"}
                     </Button>
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
                <p className="text-gray-300">Torcedor Fiel</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">ID</label>
                <p className="text-gray-300 font-mono text-xs">{userId}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Email</label>
                <p className="text-gray-300">torcedor@fiel.ia</p>
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
