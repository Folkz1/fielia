"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Format bot messages with markdown-style formatting
function formatBotMessage(content: string): string {
  return content
    // Bold text: *text* -> <strong>text</strong>
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    // Links: [text](url) -> <a href="url">text</a>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Get current user from API
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.userId) {
          setUserId(data.userId);
          loadChatHistory(data.userId);
        }
      })
      .catch(error => console.error('Error getting user:', error));
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
          const chatMessages = latestChat.messages.map((msg: any) => ({
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

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
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
