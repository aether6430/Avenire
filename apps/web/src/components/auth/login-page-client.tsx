"use client";

import { LoginForm } from "@avenire/auth/components/login";
import { useSearchParams } from "next/navigation";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

function getSingleValue(value: string | null) {
  return value ?? undefined;
}

function safeCallbackURL(url: string | null | undefined): string {
  if (!url) return "/workspace";
  // Only allow same-origin relative paths to prevent open redirects
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/workspace";
}

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const initialError =
    getSingleValue(searchParams.get("error")) ??
    getSingleValue(searchParams.get("error_description")) ??
    null;
  const initialEmail = getSingleValue(searchParams.get("email")) ?? "";
  const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));

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
