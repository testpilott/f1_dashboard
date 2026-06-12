import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News",
  description:
    "Latest Formula 1 news, race reports and team announcements aggregated from major outlets.",
  openGraph: {
    title: "News · F1 Dashboard",
    description:
      "Latest Formula 1 news, race reports and team announcements aggregated from major outlets.",
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
