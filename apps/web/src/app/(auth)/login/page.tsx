import { Suspense } from "react";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/login",
  title: "Log in",
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
