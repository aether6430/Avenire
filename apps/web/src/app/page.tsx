import { LandingPage } from "@/components/marketing/landing-page";
import { buildPageMetadata, metadataBase } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Upload notes, PDFs, and study materials. Avenire turns them into methods, Mindset Sets, weak-spot review, and guided AI explanations for clearer thinking.",
  path: "/",
  title: "AI Learning Workspace for Notes, Methods, and Mindset Sets",
});

export const dynamic = "force-static";

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
          "An AI learning workspace that helps students learn from notes, PDFs, and source materials with guided methods, Mindset Sets, and interactive reasoning.",
        featureList: [
          "Guided methods for hard questions",
          "Study from notes and PDFs",
          "Mindset Set generation and review",
          "Misconception tracking",
          "Connected study workspace",
        ],
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
