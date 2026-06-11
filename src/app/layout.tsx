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
  title: "F1 Dashboard",
  description: "Live standings, session data, projections and news for Formula 1",
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
        <Providers>
          <Navbar />
          {/* Offset for desktop sidebar + mobile top/bottom bars */}
          <main className="flex-1 lg:pl-56 pt-14 lg:pt-0 pb-16 lg:pb-0">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
