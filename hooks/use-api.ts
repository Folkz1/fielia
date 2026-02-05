"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

// Fetcher padrao para SWR
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// Cache configuration
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 segundos
};

export function useRanking(period: 'weekly' | 'monthly' | 'alltime' = 'weekly', limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/ranking?period=${period}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      refreshInterval: 60000, // Atualiza a cada 1 minuto
    }
  );

  return {
    ranking: data?.ranking || [],
    isLoading,
    error: error?.message || null,
    refresh: mutate,
  };
}

export function useQuiz() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitQuiz = useCallback(async (userId: string, quizId: string, answers: any[]) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, quizId, answers }),
      });

      if (!res.ok) throw new Error('Failed to submit quiz');
      return await res.json();
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submitQuiz, isSubmitting };
}

export function useSubscription() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createSubscription = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: 'premium' }),
      });

      if (!res.ok) throw new Error('Failed to create subscription');
      return await res.json();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/subscription?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel subscription');
      return await res.json();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { createSubscription, cancelSubscription, isProcessing };
}

export function useNews(category: string = 'Todas') {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/news?category=${encodeURIComponent(category)}`,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 300000, // Atualiza a cada 5 minutos
    }
  );

  return {
    news: data?.news || [],
    isLoading,
    error: error?.message || null,
    refresh: mutate,
  };
}

export function useUserStats(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/user/${userId}/stats` : null,
    fetcher,
    swrConfig
  );

  return {
    stats: data?.stats || null,
    isLoading,
    error: error?.message || null,
    refresh: mutate,
  };
}

export function useActiveQuiz() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/quiz/active',
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 60000, // Atualiza a cada 1 minuto
    }
  );

  return {
    quiz: data?.quiz || null,
    isLoading,
    error: error?.message || null,
    refresh: mutate,
  };
}
