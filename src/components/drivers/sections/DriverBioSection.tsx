import { MapPin } from "lucide-react";
import type { DriverStanding } from "@/lib/types";
import DriverBirthplace from "@/components/drivers/DriverBirthplace";

type Birthplace = {
  city: string | null;
  wikiUrl: string | null;
};

export default function DriverBioSection({
  driver,
  flag,
  age,
  wikidataLoading,
  birthplace,
}: {
  driver: DriverStanding;
  flag: string;
  age: number | null;
  wikidataLoading: boolean;
  birthplace: Birthplace;
}) {
  return (
    <div className="px-5 py-3.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm text-foreground/80">
        <MapPin size={13} className="text-muted-foreground/50 shrink-0" />
        <span>
          {flag} {driver.Driver.nationality}
        </span>
        {age !== null && (
          <span className="text-muted-foreground ml-1">· Age {age}</span>
        )}
      </div>
      {wikidataLoading && (
        <div className="h-3 w-28 bg-muted animate-pulse rounded pl-5" />
      )}
      {!wikidataLoading && (
        <DriverBirthplace city={birthplace.city} wikiUrl={birthplace.wikiUrl} />
      )}
    </div>
  );
}
