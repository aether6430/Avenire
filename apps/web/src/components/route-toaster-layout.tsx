import { RouteToasterClient } from "@/components/route-toaster-client";

export function RouteToasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <RouteToasterClient />
    </>
  );
}
