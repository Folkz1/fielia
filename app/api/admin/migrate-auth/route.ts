import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-news-sync-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.NEWS_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add image column to users
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT`);
    results.push("users.image added");

    // Add reset token columns
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetTokenExp" TIMESTAMPTZ`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS users_resetToken_key ON users ("resetToken")`);
    results.push("users.resetToken + resetTokenExp added");

    // Make password optional (default empty for OAuth users)
    await prisma.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN password SET DEFAULT ''`);
    results.push("users.password default set to empty");

    // Create accounts table for OAuth
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        UNIQUE(provider, "providerAccountId")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS accounts_userId_idx ON accounts ("userId")`);
    results.push("accounts table created");

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Auth Migration]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed", results },
      { status: 500 }
    );
  }
}
