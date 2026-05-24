import { RouteToasterClient } from "@/components/route-toaster-client";

export default function WaitlistLayout({
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
