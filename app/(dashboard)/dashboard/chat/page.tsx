"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Bot, User, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Format bot messages: markdown → HTML safe (no raw HTML, no double-linking)
function formatBotMessage(content: string): string {
  // Step 1: Strip ALL HTML tags (API pode retornar fragmentos HTML)
  let text = content.replace(/<[^>]*>/g, "");

  // Step 2: Collect all URLs first, replace with placeholders
  const urls: string[] = [];
  // Absolute URLs
  text = text.replace(/https?:\/\/[^\s"'<>)]+/g, (url) => {
    const clean = url.replace(/[.,;:!?]+$/, "");
    urls.push(clean);
    return `%%LINK_${urls.length - 1}%%`;
  });
  // Relative /news/ URLs
  text = text.replace(/\/news\/[a-zA-Z0-9_-]+/g, (url) => {
    urls.push(url);
    return `%%LINK_${urls.length - 1}%%`;
  });

  // Step 3: Bold *text*
  text = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // Step 4: Markdown links [text](url) — unlikely after strip but just in case
  text = text.replace(/\[([^\]]+)\]\(%%LINK_(\d+)%%\)/g, (_m, label, idx) => {
    const url = urls[parseInt(idx)];
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-yellow-500 hover:text-yellow-400 underline">${label}</a>`;
  });

  // Step 5: Replace remaining placeholders with clickable links
  text = text.replace(/%%LINK_(\d+)%%/g, (_m, idx) => {
    const url = urls[parseInt(idx)];
    const isNews = url.startsWith("/news/");
    const label = isNews ? "Ler mais" : url.replace(/^https?:\/\//, "").slice(0, 40);
    const href = isNews ? url : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-yellow-500 hover:text-yellow-400 underline">${label}</a>`;
  });

  // Step 6: Line breaks
  text = text.replace(/\n/g, "<br />");

  return text;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Get current user from API
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        setIsPremium(Boolean(data.isPremium));
        if (data.userId) {
          setUserId(data.userId);
          loadChatHistory(data.userId);
        }
      })
      .catch(error => {
        setIsPremium(false);
        console.error('Error getting user:', error);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async (uid: string) => {
    try {
      const response = await fetch(`/api/chat?userId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.chats && data.chats.length > 0) {
          const latestChat = data.chats[0];
          const chatMessages = latestChat.messages.map((msg: { role: string; content: string; createdAt: string }) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
          }));
          setMessages(chatMessages);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !userId) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId,
          platform: "web",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (response.status === 403 && data.requiresPremium) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response || "Chat com IA no app e exclusivo para assinantes Fiel Premium.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPremium === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/20">
            <Lock className="h-7 w-7 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Chat IA exclusivo Premium</h1>
          <p className="mt-3 text-sm text-gray-300">
            O plano gratuito mantem quiz mensal, ranking limitado e conteudo do grupo. O chat com IA no app fica liberado apos a assinatura.
          </p>
          <a
            href="/dashboard/settings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-yellow-600"
          >
            <Crown className="h-4 w-4" />
            Assinar Premium
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Chat com a IA Corinthiana</h1>
            <p className="text-gray-300 text-sm font-medium">
              Converse sobre a história, jogadores, títulos e curiosidades do Timão
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-xl">
                  <Bot className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Olá, Fiel! 🦅</h3>
                  <p className="text-gray-300 max-w-md">
                    Sou a IA especializada em Corinthians. Pergunte-me sobre a história do clube,
                    jogadores lendários, títulos conquistados e muito mais!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {[
                    { text: "/menu", label: "📋 Ver Menu" },
                    { text: "1", label: "📰 Notícias" },
                    { text: "2", label: "❓ Quiz" },
                    { text: "4", label: "👑 Ranking" },
                    { text: "/historia", label: "📚 História" },
                    { text: "Quando foi fundado?", label: "🗓️ Fundação" },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.text}
                      onClick={() => {
                        setInput(suggestion.text);
                        // Auto-submit for commands
                        if (suggestion.text.startsWith('/') || /^[0-9]$/.test(suggestion.text)) {
                          setTimeout(() => {
                            if (formRef.current) formRef.current.requestSubmit();
                          }, 100);
                        }
                      }}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-sm text-white transition-all font-medium"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl p-4 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}
                  >
                    <div
                      className={`text-sm leading-relaxed whitespace-pre-wrap max-w-none ${
                        message.role === "user"
                          ? "text-black font-medium"
                          : "prose prose-invert"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: formatBotMessage(message.content)
                      }}
                    />
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user" ? "text-black/70 font-medium" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { cmd: '/menu', icon: '📋', label: 'Menu' },
            { cmd: '1', icon: '📰', label: 'Notícias' },
            { cmd: '2', icon: '❓', label: 'Quiz' },
            { cmd: '4', icon: '👑', label: 'Ranking' },
          ].map((action) => (
            <button
              key={action.cmd}
              onClick={() => {
                setInput(action.cmd);
                setTimeout(() => {
                  if (formRef.current) formRef.current.requestSubmit();
                }, 100);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-all disabled:opacity-50 font-medium"
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite /menu ou sua mensagem..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-corinthians-gold disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
