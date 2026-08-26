import { Suspense } from "react";
import { ChangePasswordPageClient } from "@/components/auth/change-password-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/change-password",
  title: "Change password",
});

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordPageClient />
    </Suspense>
  );
}
