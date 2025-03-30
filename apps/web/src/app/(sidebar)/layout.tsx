"use client"

import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@avenire/ui/components/sidebar";
import { Sidebar } from "../../components/sidebar";
import { useUserStore } from "../../stores/userStore";
import { unauthorized } from "next/navigation"
import { Navbar } from "../../components/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { user, fetchUser } = useUserStore();
  useEffect(() => {
    const check = async () => {
      await fetchUser();
      if (!user?.id) {
        unauthorized()
      }
    };
    check();
  }, [fetchUser]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 w-full h-screen overflow-y-scroll">
          <Navbar />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
