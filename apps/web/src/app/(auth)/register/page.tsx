import type { Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterPageClient } from "@/components/auth/register-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";
import { resolveAuthEntryCallbackURL } from "../auth-entry-route-model";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/register",
  title: "Create account",
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const callbackURL = resolveAuthEntryCallbackURL({
    fallback: "/onboarding",
    value: query.callbackURL,
  });
  let session: Awaited<ReturnType<typeof getRouteSession>> = null;

  try {
    session = await getRouteSession();
  } catch {
    session = null;
  }

  if (session?.user) {
    redirect(callbackURL as Route);
  }
  return (
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  );
}
