import StandingsTables from "@/components/standings/StandingsTables";
import NextRaceCard from "@/components/next-race/NextRaceCard";

export const metadata = {
  title: "F1 Dashboard · Championship Standings",
};

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      {/* Left column — standings */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Championship Standings</h1>
        <StandingsTables />
      </section>

      {/* Right column — next race + quick links */}
      <aside className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-zinc-400 mb-3">Next Race</h2>
          <NextRaceCard />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/weekend", label: "Race Weekend", sub: "Sessions & results" },
            { href: "/schedule", label: "Calendar", sub: "Full 2026 schedule" },
            { href: "/projections", label: "Projections", sub: "Monte Carlo sim" },
            { href: "/news", label: "News", sub: "Latest F1 news" },
          ].map(({ href, label, sub }) => (
            <a
              key={href}
              href={href}
              className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-colors"
            >
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}

