import type { Metadata } from "next";
import localFont from "next/font/local";
import { metadataBase } from "@/lib/page-metadata";
import "./globals.css";

const fontSans = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const fontSerif = localFont({
  src: "./fonts/lora-latin-variable.woff2",
  variable: "--font-serif",
  display: "swap",
  weight: "400 700",
});

const fontMono = localFont({
  src: "./fonts/inconsolata-latin-variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "200 900",
});

const fonde = localFont({
  src: "./fonde.ttf",
  variable: "--font-fonde",
  display: "swap",
});

const description =
  "Avenire is an AI learning workspace for deep study, research, and interactive reasoning. Upload notes, ask better questions, and turn complexity into understanding.";

const defaultOgImage = {
  alt: "Avenire — AI learning workspace",
  height: 630,
  type: "image/png",
  url: "/api/og?title=Avenire&description=Learn%20with%20context",
  width: 1200,
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Avenire",
    template: "%s",
  },
  description,
  manifest: "/manifest.json",
  openGraph: {
    description,
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
        {children}
      </body>
    </html>
  );
}
