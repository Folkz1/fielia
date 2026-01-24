import { Sidebar } from "@/components/dashboard/sidebar";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-corinthians relative" style={{ paddingLeft: '16rem' }}>
      <Sidebar />
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
