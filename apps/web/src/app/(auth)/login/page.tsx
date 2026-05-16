import type { Route } from "next";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";
import {
  readSingleAuthSearchParam,
  resolveAuthEntryCallbackURL,
} from "../auth-entry-route-model";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  path: "/login",
  title: "Sign in",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, query] = await Promise.all([getRouteSession(), searchParams]);
  const callbackURL = resolveAuthEntryCallbackURL({
    fallback: "/workspace",
    value: query.callbackURL,
  });

  if (session?.user) {
    redirect(callbackURL as Route);
  }

  const initialError =
    readSingleAuthSearchParam(query.error) ??
    readSingleAuthSearchParam(query.error_description);
  const initialEmail = readSingleAuthSearchParam(query.email) ?? "";

  return (
    <LoginPageClient
      callbackURL={callbackURL}
      initialEmail={initialEmail}
      initialError={initialError}
    />
  );
}
