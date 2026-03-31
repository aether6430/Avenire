import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MeetApollo } from "@/components/landing/MeetApollo";
import { Navbar } from "@/components/landing/Navbar";
import { metadataBase } from "@/lib/page-metadata";

export const metadata = {
  alternates: {
    canonical: "/",
  },
  title: "Avenire | AI Learning Workspace for Research and Deep Understanding",
  description:
    "Avenire is an AI learning workspace for students, researchers, and curious teams. Upload notes, explore ideas step by step, and build real understanding instead of collecting shallow answers.",
};

export default function Page() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        description:
          "Avenire builds an AI learning workspace for deep study, research, and interactive reasoning.",
        logo: new URL("/branding/avenire-logo-full.png", metadataBase).toString(),
        name: "Avenire",
        url: metadataBase.toString(),
      },
      {
        "@type": "SoftwareApplication",
        applicationCategory: "EducationalApplication",
        description:
          "An AI learning workspace that helps people study, research, and understand complex ideas with interactive reasoning.",
        name: "Avenire",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        operatingSystem: "Web",
        url: metadataBase.toString(),
      },
      {
        "@type": "WebSite",
        description:
          "Avenire is an AI learning workspace for deep study, research, and interactive reasoning.",
        name: "Avenire",
        url: metadataBase.toString(),
      },
    ],
  };

  return (
    <main className="landing-light-scope min-h-screen bg-background text-foreground">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        type="application/ld+json"
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <MeetApollo />
      <CTA />
      <Footer />
    </main>
  );
}
