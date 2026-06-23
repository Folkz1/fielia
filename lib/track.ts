"use client";

// Tracking de funil leve, próprio (sem ferramenta externa).
// Grava eventos via /api/track. Nunca lança erro pro chamador — tracking
// jamais pode quebrar a navegação do usuário.

const ANON_KEY = "fiel_anon_id";

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

function readUtm(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utmSource: p.get("utm_source") || undefined,
      utmMedium: p.get("utm_medium") || undefined,
      utmCampaign: p.get("utm_campaign") || undefined,
    };
  } catch {
    return {};
  }
}

export function track(type: string, metadata?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const utm = readUtm();
    const payload = JSON.stringify({
      type,
      anonId: getAnonId(),
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      ...utm,
      metadata,
    });
    const url = "/api/track";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(url, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* tracking nunca quebra a navegação */
  }
}
