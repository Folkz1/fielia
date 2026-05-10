import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listYouTubeRagJobs } from "@/lib/youtube/jobs";

export const runtime = "nodejs";

async function checkAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin || false;
}

export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "30", 10) || 30;
  return NextResponse.json(listYouTubeRagJobs(limit));
}
