import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StatBox from "@/components/drivers/StatBox";

type DriverCareerStats = import("@/lib/stats/driverCareer").DriverCareerStats;

export default function DriverCareerSection({
  careerLoading,
  careerData,
}: {
  careerLoading: boolean;
  careerData?: DriverCareerStats;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={13} className="text-chart-5 shrink-0" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Career
        </h3>
      </div>
      {careerLoading && (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}
      {careerData && (
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Starts" value={careerData.starts === null ? "—" : String(careerData.starts)} />
          <StatBox
            label="Wins"
            value={careerData.wins === null ? "—" : String(careerData.wins)}
            highlight={typeof careerData.wins === "number" && careerData.wins > 0}
          />
          <StatBox
            label="Podiums"
            value={careerData.podiums === null ? "—" : String(careerData.podiums)}
            highlight={typeof careerData.podiums === "number" && careerData.podiums > 0}
          />
          <StatBox
            label="Fastest"
            value={careerData.fastestLaps === null ? "—" : String(careerData.fastestLaps)}
          />
          <StatBox
            label="Champs"
            value={
              typeof careerData.championships === "number" && careerData.championships > 0
                ? String(careerData.championships)
                : "—"
            }
            highlight={typeof careerData.championships === "number" && careerData.championships > 0}
          />
        </div>
      )}
    </div>
  );
}
