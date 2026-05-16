import { LandingPage } from "@/components/marketing/landing-page";
import { buildPageMetadata, metadataBase } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Study from sources, ask better questions, and turn notes into review.",
  path: "/",
  title: "AI Learning Workspace for clearer thinking",
});

export default function Page() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        description:
          "Avenire builds an AI learning workspace for deep study, research, and interactive reasoning.",
        logo: new URL(
          "/branding/avenire-logo-full.png",
          metadataBase
        ).toString(),
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
      <LandingPage />
    </>
  );
}
