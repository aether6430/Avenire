"use client";

import { ChangePasswordForm } from "@avenire/auth/components/change-password";
import { AuthShell } from "@/components/auth-shell";

export function ChangePasswordPageClient() {
  return (
    <AuthShell>
      <div className="w-full max-w-lg">
        <ChangePasswordForm />
      </div>
    </AuthShell>
  );
}
