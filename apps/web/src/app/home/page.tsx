import { LandingPage } from "@/app/page";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Upload notes, PDFs, and study materials. Avenire helps you ask questions, create flashcards, find weak spots, and review with an AI tutor.",
  path: "/home",
  title: "AI Study App for Notes, Flashcards, Quizzes, and Tutoring",
});

export const dynamic = "force-static";

export default function HomePage() {
  return <LandingPage />;
}
