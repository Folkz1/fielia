import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIEL.IA - O Assistente do Torcedor Corinthiano",
  description: "Quizzes semanais, notícias personalizadas e assistente inteligente no WhatsApp para a Fiel Torcida.",
  keywords: ["Corinthians", "SCCP", "Fiel", "Quiz", "Notícias", "WhatsApp", "IA"],
  authors: [{ name: "Diego Fernandes" }],
  openGraph: {
    title: "FIEL.IA - O Assistente do Torcedor Corinthiano",
    description: "Quizzes semanais, notícias personalizadas e assistente inteligente no WhatsApp.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIEL.IA - O Assistente do Torcedor Corinthiano",
    description: "Quizzes semanais, notícias personalizadas e assistente inteligente no WhatsApp.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${bebas.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
