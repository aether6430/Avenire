import type { Route } from "next";
import { redirect } from "next/navigation";
import { RegisterPageClient } from "@/components/auth/register-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";
import { resolveAuthEntryCallbackURL } from "../auth-entry-route-model";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/register",
  title: "Create an account",
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, query] = await Promise.all([getRouteSession(), searchParams]);
  const callbackURL = resolveAuthEntryCallbackURL({
    fallback: "/onboarding",
    value: query.callbackURL,
  });

  if (session?.user) {
    redirect(callbackURL as Route);
  }

  return <RegisterPageClient callbackURL={callbackURL} />;
}
