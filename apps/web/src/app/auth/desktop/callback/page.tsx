import type { Route } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Return to Avenire Desktop",
});

interface DesktopCallbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }
  return null;
}

export default async function DesktopCallbackPage({
  searchParams,
}: DesktopCallbackPageProps) {
  const params = await searchParams;
  const code = getParam(params, "code");
  const state = getParam(params, "state");
  const hasCode = Boolean(code);
  const hasState = Boolean(state);
  const handoffReady = hasCode && hasState;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6 py-14">
      <h1 className="font-semibold text-3xl">Return to Avenire Desktop</h1>
      <p className="text-muted-foreground">
        {handoffReady
          ? "Your sign-in details are ready. Return to the desktop app to continue."
          : "This sign-in handoff is incomplete. Return to Avenire Desktop and try again from there."}
      </p>
      <div className="rounded-md border bg-card p-4 text-sm">
        <p>
          <strong>Authorization code:</strong>{" "}
          {hasCode ? "Received" : "Missing"}
        </p>
        <p>
          <strong>Session state:</strong> {hasState ? "Received" : "Missing"}
        </p>
      </div>
      <div>
        <Link className="underline" href={"/workspace" as Route}>
          Open workspace on web
        </Link>
      </div>
    </main>
  );
}
