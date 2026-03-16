import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase().trim() },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        // Check premium status
        const now = new Date();
        const isPremiumActive =
          user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now);

        if (user.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isPremium: false, subscriptionEnd: null },
          });
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
  secret: process.env.NEXTAUTH_SECRET,
});
