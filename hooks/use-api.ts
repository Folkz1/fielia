"use client";

import { useState, useEffect } from "react";

export function useRanking(period: 'weekly' | 'monthly' | 'alltime' = 'weekly', limit: number = 10) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/ranking?period=${period}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch ranking');
        const data = await res.json();
        setRanking(data.ranking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRanking();
  }, [period, limit]);

  return { ranking, isLoading, error };
}

export function useQuiz() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitQuiz = async (userId: string, quizId: string, answers: any[]) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, quizId, answers }),
      });
      
      if (!res.ok) throw new Error('Failed to submit quiz');
      return await res.json();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitQuiz, isSubmitting };
}

export function useSubscription() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createSubscription = async (userId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: 'premium' }),
      });
      
      if (!res.ok) throw new Error('Failed to create subscription');
      return await res.json();
    } catch (err) {
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelSubscription = async (userId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/subscription?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return await res.json();
    } catch (err) {
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { createSubscription, cancelSubscription, isProcessing };
}

export function useNews(category: string = 'Todas') {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/news?category=${category}`);
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        setNews(data.news);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
  }, [category]);

  return { news, isLoading, error };
}
