import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export const metadata = {
  title: "Terms — Avenire",
  description: "Avenire terms of service.",
};

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
    <main
      className="min-h-screen bg-background text-foreground"
      id="page-content"
    >
      <Navbar />

      <section className="px-4 pt-32 pb-20 sm:pt-36">
        <div className="mx-auto max-w-4xl">
          <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            legal
          </p>
          <h1 className="mt-3 font-serif text-4xl text-foreground tracking-[-0.04em] md:text-6xl">
            Terms of service
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground text-sm leading-7 md:text-base">
            These terms explain the basic rules for using Avenire. They are
            intentionally short and readable so you can find the parts that
            matter without digging through legal noise.
          </p>

          <div className="mt-10 space-y-4">
            {sections.map((section) => (
              <article
                className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-[0_14px_50px_rgba(35,32,25,0.05)]"
                key={section.title}
              >
                <h2 className="font-semibold text-foreground text-lg tracking-[-0.02em]">
                  {section.title}
                </h2>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
