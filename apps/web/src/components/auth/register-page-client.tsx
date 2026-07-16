"use client";

import { RegisterForm } from "@avenire/auth/components/register";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

function getSingleValue(value: string | null) {
  return value ?? undefined;
}

function safeCallbackURL(url: string | null | undefined): string {
  if (!url) return "/onboarding";
  // Only allow same-origin relative paths to prevent open redirects
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/onboarding";
}

export function RegisterPageClient() {
  const searchParams = useSearchParams();
  const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));

  return (
    <AuthShell>
      <div className="w-full max-w-lg">
        <ParticleFormFrame
          footer={
            <>
              By clicking continue, you agree to our{" "}
              <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </>
          }
        >
          <RegisterForm callbackURL={callbackURL} />
        </ParticleFormFrame>
      </div>
    </AuthShell>
  );
}
