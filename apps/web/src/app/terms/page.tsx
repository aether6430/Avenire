import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Read the Avenire terms of service for using the AI learning and research workspace.",
  path: "/terms",
  title: "Terms of Service",
});

export const dynamic = "force-static";

const sections = [
  {
    title: "Use of the service",
    body: "You may use Avenire for personal, educational, or team workflows as long as your use follows applicable law and does not interfere with the service for others.",
  },
  {
    title: "Accounts and security",
    body: "You are responsible for the activity that happens under your account and for keeping your credentials secure. If you believe your account has been compromised, contact support promptly.",
  },
  {
    title: "Content and ownership",
    body: "You retain ownership of the material you upload. By using the product, you grant Avenire the limited rights needed to store, process, and display that content inside the service.",
  },
  {
    title: "Service changes",
    body: "We may update features, pricing, or availability over time. When a change is material, we will try to give reasonable notice before it takes effect.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be sent to support@avenire.space.",
  },
] as const;

export default function TermsPage() {
  return (
    <MarketingPageShell showDividerAfterNav>
      <section className="px-4 pt-28 pb-20 sm:pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="font-medium text-[10px] text-white/42 uppercase tracking-[0.2em]">
            Legal
          </p>
          <h1 className="mt-3 text-4xl text-white tracking-[-0.04em] md:text-6xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-sm text-white/62 leading-7 md:text-base">
            These terms explain the basic rules for using Avenire. They are
            intentionally short and readable so you can find the parts that
            matter without digging through legal noise.
          </p>

          <div className="mt-10 space-y-4">
            {sections.map((section) => (
              <article
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm"
                key={section.title}
              >
                <h2 className="font-semibold text-lg text-white tracking-[-0.02em]">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-white/62 leading-7">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
