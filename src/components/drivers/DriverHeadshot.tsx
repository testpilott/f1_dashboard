"use client";

import { useState } from "react";
import Image from "next/image";
import TeamLogo from "@/components/ui/TeamLogo";
import type { DriverStanding } from "@/lib/types";
import { matchOpenF1Driver } from "@/lib/stats/driverMapping";

export type DriverPhotoEntry = {
  driver_number: number;
  name_acronym: string;
  last_name: string;
  headshot_url: string | null;
};

export default function DriverHeadshot({
  driver,
  photos,
  size = 24,
}: {
  driver: DriverStanding;
  photos: DriverPhotoEntry[];
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const match = matchOpenF1Driver(photos as Parameters<typeof matchOpenF1Driver>[0], {
    driverId: driver.Driver.driverId,
    code: driver.Driver.code,
    familyName: driver.Driver.familyName,
  });
  const url = match?.headshot_url;

  if (errored || !url) return <TeamLogo team={team} size={size} />;

  return (
    <Image
      src={url}
      alt={`${driver.Driver.givenName} ${driver.Driver.familyName}`}
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}