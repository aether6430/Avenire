"use client";

import { RegisterForm } from "@avenire/auth/components/register";
import Link from "next/link";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

export function RegisterPageClient({
  callbackURL = "/onboarding",
}: {
  callbackURL?: string;
}) {
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
