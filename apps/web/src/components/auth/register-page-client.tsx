"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@avenire/auth/components/register";
import { AuthShell } from "@/components/auth-shell";
import { ParticleFormFrame } from "@/components/auth/particle-form-frame";

function getSingleValue(value: string | null) {
  return value ?? undefined;
}

export function RegisterPageClient() {
  const searchParams = useSearchParams();
  const callbackURL =
    getSingleValue(searchParams.get("callbackURL")) ?? "/onboarding";

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
