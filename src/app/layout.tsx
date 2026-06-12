import type { Metadata, Viewport } from "next";
import { Titillium_Web, Exo_2, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/layout/Navbar";

// Primary body font — closest free alternative to Formula1 Display
const titilliumWeb = Titillium_Web({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "900"],
  display: "swap",
});

// Display/heading font — slightly more condensed, F1 Display "Wide" feel
const exo2 = Exo_2({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app",
  ),
  title: {
    default: "F1 Dashboard",
    template: "%s · F1 Dashboard",
  },
  description: "Live standings, session data, projections and news for Formula 1",
  applicationName: "F1 Dashboard",
  openGraph: {
    title: "F1 Dashboard",
    description: "Live Formula 1 standings, race results, telemetry and projections.",
    type: "website",
    siteName: "F1 Dashboard",
  },
  twitter: {
    card: "summary_large_image",
    title: "F1 Dashboard",
    description: "Live Formula 1 standings, race results, telemetry and projections.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${titilliumWeb.variable} ${exo2.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        >
          Skip to main content
        </a>
        <Providers>
          <Navbar />
          {/* Offset for desktop sidebar + mobile top/bottom bars */}
          <main id="main-content" className="flex-1 lg:pl-56 pt-14 lg:pt-0 pb-16 lg:pb-0">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">{children}</div>
          </main>
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "F1 Dashboard",
              url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app",
            }),
          }}
        />
      </body>
    </html>
  );
}
