import { Toaster } from "@avenire/ui/components/sonner";
import type { Metadata, Viewport } from "next";
import { Inconsolata, Inter, Lora } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { PostHogTracker } from "@/components/analytics/posthog-tracker";
import { ScrollbarActivity } from "@/components/scrollbar-activity";
import { metadataBase } from "@/lib/page-metadata";
import { Suspense } from "react";
import "react-quizlet-flashcard/dist/index.css";
import "./globals.css";

const defaultOgImage = {
  alt: "Avenire — AI learning workspace",
  height: 630,
  type: "image/png",
  url: "/api/og?template=home",
  width: 1200,
};

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Inconsolata({
  subsets: ["latin"],
  variable: "--font-mono",
});

const fonde = localFont({
  src: "./fonde.ttf",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Avenire",
    template: "%s",
  },
  description:
    "Avenire is an AI learning workspace for deep study, research, and interactive reasoning. Upload notes, ask better questions, and turn complexity into understanding.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { type: "image/svg+xml", url: "/favicon.svg" },
      { type: "image/png", url: "/branding/avenire-logo-full.png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/branding/avenire-logo-full.png",
  },
  openGraph: {
    description:
      "Avenire is an AI learning workspace for deep study, research, and interactive reasoning. Upload notes, ask better questions, and turn complexity into understanding.",
    siteName: "Avenire",
    title: "Avenire",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Avenire is an AI learning workspace for deep study, research, and interactive reasoning.",
    title: "Avenire",
    images: [
      {
        url: defaultOgImage.url,
        alt: defaultOgImage.alt,
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#141414", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fonde.variable} theme-color-transitions font-sans antialiased ${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
        style={
          {
            "--font-sans":
              '"Inter", ui-sans-serif, -apple-system, "Segoe UI", sans-serif',
          } as React.CSSProperties
        }
      >
        <ServiceWorkerRegistration />
        <ScrollbarActivity />
        <Suspense fallback={null}>
          <PostHogTracker />
        </Suspense>
        {children}
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
