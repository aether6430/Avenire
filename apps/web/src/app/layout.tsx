import { Toaster } from "@avenire/ui/components/sonner";
import type { Metadata, Viewport } from "next";
import { Inconsolata, Inter, Lora } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { PublicThemeReset } from "@/components/public-theme-reset";
import { metadataBase } from "@/lib/page-metadata";
import "./globals.css";

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
    images: ["/api/og?title=Avenire"],
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Avenire is an AI learning workspace for deep study, research, and interactive reasoning.",
    title: "Avenire",
    images: ["/api/og?title=Avenire"],
  },
};

export const viewport: Viewport = {
  themeColor: "#abcfff",
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
        <Script
          id="public-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var isWorkspace = window.location.pathname.startsWith('/workspace');
                  var root = document.documentElement;
                  if (isWorkspace) {
                    root.classList.remove('landing-light-scope');
                    return;
                  }
                  root.classList.add('landing-light-scope');
                  root.classList.remove('dark');
                  root.removeAttribute('data-theme');
                  root.style.colorScheme = 'light';
                } catch (error) {}
              })();
            `,
          }}
        />
        <PublicThemeReset />
        <ServiceWorkerRegistration />
        {children}
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
