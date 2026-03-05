import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }

  // Buscar status de admin do usuario
  let isAdmin = false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  isAdmin = user?.isAdmin || false;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/auth/login" });
  }

  return (
    <DashboardShell
      userName={session?.user?.name}
      userEmail={session?.user?.email}
      onSignOut={handleSignOut}
      isAdmin={isAdmin}
    >
      {children}
    </DashboardShell>
  );
}
