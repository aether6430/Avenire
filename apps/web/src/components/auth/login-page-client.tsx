"use client";

import { LoginForm } from "@avenire/auth/components/login";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

export function LoginPageClient({
  callbackURL = "/workspace",
  initialEmail = "",
  initialError = null,
}: {
  callbackURL?: string;
  initialEmail?: string;
  initialError?: string | null;
}) {
  return (
    <AuthShell>
      <div className="w-full max-w-lg">
        <ParticleFormFrame
          footer={
            <>
              By clicking continue, you agree to our{" "}
              <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
            </>
          }
        >
          <LoginForm
            callbackURL={callbackURL}
            initialEmail={initialEmail}
            initialError={initialError}
          />
        </ParticleFormFrame>
      </div>
    </AuthShell>
  );
}
