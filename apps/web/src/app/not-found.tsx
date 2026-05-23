import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "This page isn't here.",
});

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
          Error 404
        </p>
        <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
          This page isn&apos;t here.
        </h1>
        <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
          The route you asked for doesn&apos;t exist. Head back to the workspace
          or start again from home.
        </p>
        <a
          className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
          href="/workspace"
        >
          Open workspace
        </a>
        <p className="max-w-md text-muted-foreground text-xs">
          Or go back to the{" "}
          <a className="underline underline-offset-4" href="/">
            homepage
          </a>
          .
        </p>
      </div>
    </main>
  );
}
