"use client";

import dynamic from "next/dynamic";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";

const HowItWorks = dynamic(
  () =>
    import("@/components/landing/HowItWorks").then((module) => ({
      default: module.HowItWorks,
    })),
  {
    loading: () => <SectionPlaceholder className="min-h-[72rem]" />,
    ssr: false,
  }
);

const MeetApollo = dynamic(
  () =>
    import("@/components/landing/MeetApollo").then((module) => ({
      default: module.MeetApollo,
    })),
  {
    loading: () => <SectionPlaceholder className="min-h-[42rem]" />,
    ssr: false,
  }
);

const CTA = dynamic(
  () =>
    import("@/components/landing/CTA").then((module) => ({
      default: module.CTA,
    })),
  {
    loading: () => <SectionPlaceholder className="min-h-[32rem]" />,
    ssr: false,
  }
);

const Footer = dynamic(
  () =>
    import("@/components/landing/Footer").then((module) => ({
      default: module.Footer,
    })),
  {
    loading: () => <SectionPlaceholder className="min-h-40" />,
    ssr: false,
  }
);

function SectionPlaceholder({ className }: { className: string }) {
  return <div aria-hidden="true" className={className} />;
}

export function LandingPageClient() {
  return (
    <main className="landing-light-scope min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <HowItWorks />
      <MeetApollo />
      <CTA />
      <Footer />
    </main>
  );
}
