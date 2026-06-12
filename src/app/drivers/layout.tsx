import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drivers",
  description:
    "Current Formula 1 grid: driver profiles, season form, career stats and headshots.",
  openGraph: {
    title: "Drivers · F1 Dashboard",
    description:
      "Current Formula 1 grid: driver profiles, season form, career stats and headshots.",
  },
};

export default function DriversLayout({ children }: { children: React.ReactNode }) {
  return children;
}
