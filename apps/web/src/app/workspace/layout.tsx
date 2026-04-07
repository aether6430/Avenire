import { WorkspaceLayoutShell } from "@/components/dashboard/workspace-layout-shell";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceLayoutShell>{children}</WorkspaceLayoutShell>
  );
}
