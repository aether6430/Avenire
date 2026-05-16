"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground">
        <main className="flex min-h-dvh items-center justify-center px-6 py-16">
          <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
              Application error
            </p>
            <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
              Something went wrong.
            </h1>
            <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
              Avenire hit an unexpected failure while rendering this page. You
              can retry the route, go home, or, if you were working, reopen the
              workspace.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
                onClick={() => reset()}
                type="button"
              >
                Try again
              </button>
              <a
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 font-medium text-sm transition-colors hover:bg-muted"
                href="/"
              >
                Go home
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 font-medium text-sm transition-colors hover:bg-muted"
                href="/workspace"
              >
                Open workspace
              </a>
            </div>
            {error.digest ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                Digest: {error.digest}
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
