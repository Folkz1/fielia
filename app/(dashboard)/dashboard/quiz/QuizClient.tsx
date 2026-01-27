"use client";

import { SessionProvider } from "next-auth/react";
import { QuizManager } from "./components/QuizManager";

export default function QuizClient() {
  return (
    <SessionProvider>
      <QuizManager />
    </SessionProvider>
  );
}
