"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Race, WeatherForecast } from "@/lib/types";
import { CIRCUIT_COORDS, getWeatherIcon, getWeatherLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Cloud } from "lucide-react";
import { format, parseISO } from "date-fns";

async function fetchNextRace() {
  const res = await fetch("/api/schedule?view=next");
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.race as Race | null;
}

async function fetchWeatherForRace(country: string) {
  const res = await fetch(`/api/weather?country=${encodeURIComponent(country)}`);
  if (!res.ok) return null;
  return res.json() as Promise<WeatherForecast>;
}

function CountdownSegment({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="font-mono tabular-nums text-sm font-semibold text-zinc-100">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-zinc-500 text-xs">{label}</span>
    </span>
  );
}

function Countdown({ dateStr }: { dateStr: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = parseISO(dateStr).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return <p className="text-sm text-red-400 font-medium">Race underway</p>;
  }

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);

  return (
    <div className="flex items-center gap-2">
      {d > 0 && <CountdownSegment value={d} label="d" />}
      <CountdownSegment value={h} label="h" />
      <CountdownSegment value={m} label="m" />
      <CountdownSegment value={s} label="s" />
    </div>
  );
}

export default function NextRaceCard({
  initialRace,
  initialWeather,
}: {
  initialRace?: Race | null;
  initialWeather?: WeatherForecast | null;
}) {
  const { data: race, isLoading } = useQuery({
    queryKey: ["next-race"],
    queryFn: fetchNextRace,
    staleTime: 5 * 60 * 1000,
    initialData: initialRace,
  });

  const country = race?.Circuit?.Location?.country ?? "";
  const { data: weather } = useQuery({
    queryKey: ["weather", country],
    queryFn: () => fetchWeatherForRace(country),
    enabled: !!country,
    staleTime: 60 * 60 * 1000,
    initialData: initialWeather ?? undefined,
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full bg-zinc-800" />;
  }

  if (!race) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-zinc-500">No upcoming races found.</CardContent>
      </Card>
    );
  }

  const raceDate = parseISO(race.date);
  const isSprint = Boolean(race.Sprint);

  // Get weather for the race day itself
  const raceWeatherIdx = weather?.hourly?.time?.findIndex((t) => {
    return t.startsWith(race.date);
  }) ?? -1;
  const raceTemp = raceWeatherIdx >= 0 ? weather?.hourly?.temperature_2m[raceWeatherIdx] : null;
  const raceCode = raceWeatherIdx >= 0 ? weather?.hourly?.weather_code[raceWeatherIdx] : null;
  const rainProb = raceWeatherIdx >= 0 ? weather?.hourly?.precipitation_probability[raceWeatherIdx] : null;

  const coords = CIRCUIT_COORDS[country];

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
      <div className="h-1.5 bg-red-600 w-full" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
              Round {race.round} · {race.season}
            </p>
            <CardTitle className="text-lg leading-tight">{race.raceName}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isSprint && (
              <Badge className="bg-purple-700 text-white text-xs">Sprint Weekend</Badge>
            )}
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
              {format(raceDate, "d MMM yyyy")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
          <span>{race.Circuit.circuitName}</span>
          <span className="text-zinc-600">·</span>
          <span>{race.Circuit.Location.locality}, {country}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Clock className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
          <Countdown dateStr={race.date} />
          {race.time && (
            <span className="text-zinc-600 text-xs">({race.time.replace("Z", " UTC")})</span>
          )}
        </div>

        {(raceTemp !== null || rainProb !== null) && (
          <div className="flex items-center gap-3 pt-1 border-t border-zinc-800">
            <Cloud className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
            <span className="text-sm text-zinc-400">Race day forecast:</span>
            {raceCode != null && (
              <span className="text-sm">{getWeatherIcon(raceCode as number)} {getWeatherLabel(raceCode as number)}</span>
            )}
            {raceTemp != null && (
              <span className="text-sm text-zinc-300">{Math.round(raceTemp as number)}°C</span>
            )}
            {rainProb != null && rainProb > 20 && (
              <Badge className="bg-blue-900/60 text-blue-300 border-blue-800 text-xs">
                {rainProb}% rain
              </Badge>
            )}
          </div>
        )}

        {coords && (
          <p className="text-xs text-zinc-600">
            {coords.lat.toFixed(3)}°, {coords.lng.toFixed(3)}°
          </p>
        )}
      </CardContent>
    </Card>
  );
}
