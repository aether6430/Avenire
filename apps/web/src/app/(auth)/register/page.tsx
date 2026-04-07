import { Suspense } from "react";
import { RegisterPageClient } from "@/components/auth/register-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/register",
  title: "Create account",
});

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  );
}
