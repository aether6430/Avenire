import type { Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";
import { resolveAuthEntryCallbackURL } from "../auth-entry-route-model";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/login",
  title: "Log in",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const callbackURL = resolveAuthEntryCallbackURL({
    fallback: "/workspace",
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
      <LoginPageClient />
    </Suspense>
  );
}
