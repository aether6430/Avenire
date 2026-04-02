import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Extension Sign-In Complete",
});

export default function ExtensionSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-6 py-14">
      <h1 className="font-semibold text-3xl">Extension Sign-In Complete</h1>
      <p className="text-muted-foreground">
        The Avenire Web Clipper should pick up your session now. This tab can close automatically.
      </p>
    </main>
  );
}
