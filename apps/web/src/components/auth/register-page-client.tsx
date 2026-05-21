"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";
import { AuthShell } from "@/components/auth-shell";

const RegisterForm = dynamic(
  () =>
    import("@avenire/auth/components/register").then(
      (module) => module.RegisterForm
    ),
  {
    loading: () => (
      <div className="p-5 text-muted-foreground text-sm md:p-6">
        Loading registration...
      </div>
    ),
    ssr: false,
  }
);

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
