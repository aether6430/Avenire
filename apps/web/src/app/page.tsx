import { LandingPageClient } from "@/components/landing/landing-page-client";
import { buildPageMetadata, metadataBase } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Avenire is an AI learning workspace for students, researchers, and curious teams. Upload notes, explore ideas step by step, and build real understanding instead of collecting shallow answers.",
  path: "/",
  title: "AI Learning Workspace for Research and Deep Understanding",
});

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
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        type="application/ld+json"
      />
      <LandingPageClient />
    </>
  );
}
