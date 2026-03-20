import type { Route } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6 py-14">
      <h1 className="text-3xl font-semibold">Desktop Sign-In Callback</h1>
      <p className="text-muted-foreground">
        The desktop runtime reached this callback route. Code exchange wiring is
        not complete yet, but deep-link routing is active.
      </p>
      <div className="rounded-md border bg-card p-4 text-sm">
        <p>
          <strong>code:</strong> {code ?? "(missing)"}
        </p>
        <p>
          <strong>state:</strong> {state ?? "(missing)"}
        </p>
      </div>
      <div>
        <Link className="underline" href={"/workspace" as Route}>
          Continue to dashboard
        </Link>
      </div>
    </main>
  );
}
