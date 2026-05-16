import { RouteToasterLayout } from "@/components/route-toaster-layout";

export default function WaitlistLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RouteToasterLayout>{children}</RouteToasterLayout>;
}
