import { LandingPageClient } from "@/components/landing/landing-page-client";
import { buildPageMetadata, metadataBase } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Upload notes, PDFs, and study materials. Avenire helps you ask questions, create flashcards, find weak spots, and review with an AI tutor.",
  path: "/",
  title: "AI Study App for Notes, Flashcards, Quizzes, and Tutoring",
});

export const dynamic = "force-static";

export function LandingPage() {
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
          "An AI study app that helps students learn from notes, PDFs, and source materials with tutoring, flashcards, quizzes, and interactive reasoning.",
        featureList: [
          "AI tutor for student questions",
          "Study from notes and PDFs",
          "Flashcard and quiz generation",
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
      <LandingPageClient />
    </>
  );
}

export default function Page() {
  return <LandingPage />;
}
