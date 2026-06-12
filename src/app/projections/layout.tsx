import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projections",
  description:
    "Monte Carlo championship projections based on the current Formula 1 season.",
  openGraph: {
    title: "Projections · F1 Dashboard",
    description:
      "Monte Carlo championship projections based on the current Formula 1 season.",
  },
};

export default function ProjectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
