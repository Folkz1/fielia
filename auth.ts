import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Credentials provider requer estratégia JWT explícita no NextAuth v5
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        if (!email || !password) return null;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
          });
        } catch (err) {
          console.error("[Auth] Erro ao buscar usuário:", err);
          return null;
        }

        if (!user) return null;

        // Usuários criados pelo checkout têm password gerada aleatoriamente e não conhecida
        // Verificar se o hash é válido antes de comparar
        if (!user.password || user.password === "") return null;

        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (err) {
          console.error("[Auth] Erro ao comparar senha:", err);
          return null;
        }

        if (!isPasswordValid) return null;

        // Check premium status
        const now = new Date();
        const isPremiumActive =
          user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now);

        if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
          // Revogar premium expirado de forma não-bloqueante
          prisma.user.update({
            where: { id: user.id },
            data: { isPremium: false, subscriptionEnd: null },
          }).catch((err) => console.error("[Auth] Erro ao revogar premium:", err));
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: isPremiumActive ? "premium" : "free",
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});
