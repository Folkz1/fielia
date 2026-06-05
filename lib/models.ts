/**
 * Catalogo central de modelos LLM disponiveis via OpenRouter.
 *
 * Fonte unica de verdade:
 *  - MODEL_GROUPS  -> usado pela Configuracao da IA (/admin/ia) com optgroups
 *  - MODEL_OPTIONS -> lista achatada usada pelo LLM Lab (/admin/llm-lab) e por modelLabel
 *
 * Custo entre parenteses no label = USD por 1M tokens (entrada / saida) no OpenRouter.
 * Ranking top-weekly do OpenRouter (maio/2026), validado no catalogo.
 */
export interface ModelOption {
  value: string;
  label: string;
  /** Modelos gratuitos/experimentais (derivado do value :free ou do label). */
  free?: boolean;
}

export interface ModelGroup {
  label: string;
  models: { value: string; label: string }[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "⭐ Recomendados pra conversa de torcedor (testados 29/05)",
    models: [
      { value: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash — natural e barato ($0.10/$0.20)" },
      { value: "openai/gpt-4o-mini", label: "GPT-4o mini — rápido, bom fallback ($0.15/$0.60)" },
      { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite — atual/estável ($0.25/$1.50)" },
    ],
  },
  {
    label: "🔥 Mais usados no OpenRouter (top 20 — maio/2026)",
    models: [
      { value: "tencent/hy3-preview", label: "Hy3 preview ($0.06/$0.21)" },
      { value: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7 — caro ($5/$25)" },
      { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 ($3/$15)" },
      { value: "openrouter/owl-alpha", label: "Owl Alpha — experimental/grátis" },
      { value: "xiaomi/mimo-v2.5", label: "MiMo V2.5 ($0.14/$0.28)" },
      { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro ($0.44/$0.87)" },
      { value: "xiaomi/mimo-v2.5-pro", label: "MiMo V2.5 Pro ($0.44/$0.87)" },
      { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2 ($0.25/$0.38)" },
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview ($0.50/$3)" },
      { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super 120B ($0.09/$0.45)" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — barato ($0.10/$0.40)" },
      { value: "moonshotai/kimi-k2.6", label: "Kimi K2.6 ($0.68/$3.42)" },
      { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6 — caro ($5/$25)" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash ($0.30/$2.50)" },
      { value: "poolside/laguna-m.1:free", label: "Laguna M.1 — experimental/grátis" },
      { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash — caro ($1.50/$9)" },
      { value: "minimax/minimax-m2.7", label: "MiniMax M2.7 ($0.26/$1.20)" },
      { value: "openai/gpt-5.5", label: "GPT-5.5 — caro ($5/$30)" },
    ],
  },
];

/** Lista achatada (todos os modelos), com flag free derivada. */
export const MODEL_OPTIONS: ModelOption[] = MODEL_GROUPS.flatMap((g) =>
  g.models.map((m) => ({
    ...m,
    free: m.value.includes(":free") || /grátis|gratis|free/i.test(m.label),
  }))
);

/** Procura o label amigavel de um model id; cai pro proprio id se desconhecido. */
export function modelLabel(value: string): string {
  return MODEL_OPTIONS.find((m) => m.value === value)?.label ?? value;
}
