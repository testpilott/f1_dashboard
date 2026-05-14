import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F1 Dashboard",
  description: "Live standings, session data, projections and news for Formula 1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
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
