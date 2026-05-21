"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useState } from "react";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

const LoginForm = dynamic(
  () =>
    import("@avenire/auth/components/login").then((module) => module.LoginForm),
  {
    loading: () => (
      <div className="p-5 text-muted-foreground text-sm md:p-6">
        Loading sign in...
      </div>
    ),
    ssr: false,
  }
);

export function LoginPageClient({
  callbackURL = "/workspace",
  initialEmail = "",
  initialError = null,
}: {
  callbackURL?: string;
  initialEmail?: string;
  initialError?: string | null;
}) {
  const [shouldRenderForm, setShouldRenderForm] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setShouldRenderForm(true);
    });
  }, []);

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
          {shouldRenderForm ? (
            <LoginForm
              callbackURL={callbackURL}
              initialEmail={initialEmail}
              initialError={initialError}
            />
          ) : (
            <div className="p-5 text-muted-foreground text-sm md:p-6">
              Loading sign in...
            </div>
          )}
        </ParticleFormFrame>
      </div>
    </AuthShell>
  );
}
