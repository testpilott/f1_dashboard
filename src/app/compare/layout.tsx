import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Head-to-head driver and constructor comparisons across seasons and circuits.",
  openGraph: {
    title: "Compare · F1 Dashboard",
    description:
      "Head-to-head driver and constructor comparisons across seasons and circuits.",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
