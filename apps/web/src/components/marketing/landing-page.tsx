import { DivideX } from "@/components/marketing/divide";
import { Hero } from "@/components/marketing/hero";
import { HeroImage } from "@/components/marketing/hero-image";
import { Navbar } from "@/components/marketing/navbar";

export function LandingPage() {
  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      <DivideX />
      <Hero />
      <DivideX />
      <HeroImage />
    </main>
  );
}
