import { RouteToasterClient } from "@/components/route-toaster-client";

export default function AuthLayout({
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
