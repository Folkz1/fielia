"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "modern" | "classic" | "gold";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeLabel: string;
}

const THEME_LABELS: Record<Theme, string> = {
  modern: "Moderno (Laranja)",
  classic: "Classico (Preto/Branco)",
  gold: "Gold (Dourado)",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "fiel-ia-theme";
const DEFAULT_THEME: Theme = "modern";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // Carregar tema salvo do localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme;
      if (savedTheme && ["modern", "classic", "gold"].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error("Erro ao carregar tema:", error);
    }
  }, []);

  // Aplicar classe do tema no document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remover todas as classes de tema
    root.classList.remove("theme-modern", "theme-classic", "theme-gold");

    // Adicionar classe do tema atual (exceto modern que e o default)
    if (theme !== "modern") {
      root.classList.add(`theme-${theme}`);
    }

    // Salvar no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.error("Erro ao salvar tema:", error);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    themeLabel: THEME_LABELS[theme],
  };

  // Evitar flash de tema errado no servidor
  if (!mounted) {
    return (
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Componente de seletor de tema
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-400">Tema de Cores</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`
              p-4 rounded-xl border-2 transition-all text-left
              ${theme === t
                ? "border-[var(--gradient-accent-start)] bg-white/5"
                : "border-white/10 hover:border-white/20"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full ${
                  t === "modern"
                    ? "bg-[#FF6B00]"
                    : t === "classic"
                    ? "bg-white"
                    : "bg-[#FFD700]"
                }`}
              />
              <span className="font-medium text-sm">{THEME_LABELS[t]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
