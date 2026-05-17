"use client";

import { useQuery } from "@tanstack/react-query";
import type { Race, WeatherForecast } from "@/lib/types";
import { useNow } from "@/lib/hooks/useNow";
import { CIRCUIT_COORDS, getWeatherIcon, getWeatherLabel, getCircuitImageUrl } from "@/lib/constants";
import CircuitThumb from "@/components/schedule/CircuitThumb";
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
      <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </span>
  );
}

function Countdown({ dateStr }: { dateStr: string }) {
  const now = useNow();
  if (now === null) return null;

  const target = parseISO(dateStr).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return <p className="text-sm text-primary font-medium">Race underway</p>;
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
    return <Skeleton className="h-48 w-full" />;
  }

  if (!race) {
    return (
      <Card className="bg-surface-2 border-border">
        <CardContent className="pt-6 text-muted-foreground">No upcoming races found.</CardContent>
      </Card>
    );
  }

  const raceDate = parseISO(race.date);
  const isSprint = Boolean(race.Sprint);

  // Get weather for the race day itself
  const raceWeatherIdx = weather?.hourly?.time?.findIndex((t) => {
    return t.startsWith(race.date);
  }) ?? -1;
  const temps = weather?.hourly?.temperature_2m;
  const codes = weather?.hourly?.weather_code;
  const probs = weather?.hourly?.precipitation_probability;
  const raceTemp = raceWeatherIdx >= 0 && temps && raceWeatherIdx < temps.length ? temps[raceWeatherIdx] : null;
  const raceCode = raceWeatherIdx >= 0 && codes && raceWeatherIdx < codes.length ? codes[raceWeatherIdx] : null;
  const rainProb = raceWeatherIdx >= 0 && probs && raceWeatherIdx < probs.length ? probs[raceWeatherIdx] : null;

  const coords = CIRCUIT_COORDS[country];
  const circuitImgUrl = getCircuitImageUrl(race.Circuit.circuitId);

  return (
    <Card className="relative bg-surface-2 border-border overflow-hidden">
      <div className="h-1.5 bg-primary w-full" />
      {circuitImgUrl && (
        <div className="pointer-events-none absolute right-2 top-1/2 z-0 hidden -translate-y-1/2 opacity-20 sm:block">
          <CircuitThumb url={circuitImgUrl} country={country} size={160} />
        </div>
      )}
      <div className="relative z-10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Round {race.round} · {race.season}
            </p>
            <CardTitle className="text-lg leading-tight">{race.raceName}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isSprint && (
              <Badge className="bg-accent-2/20 text-accent-2 border-accent-2/40 text-xs">Sprint Weekend</Badge>
            )}
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">
              {format(raceDate, "d MMM yyyy")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
          <span>{race.Circuit.circuitName}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{race.Circuit.Location.locality}, {country}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
          <Countdown dateStr={race.date} />
          {race.time && (
            <span className="text-muted-foreground/50 text-xs">({race.time.replace("Z", " UTC")})</span>
          )}
        </div>

        {(raceTemp !== null || rainProb !== null) && (
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <Cloud className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Race day forecast:</span>
            {raceCode != null && (
              <span className="text-sm">{getWeatherIcon(raceCode as number)} {getWeatherLabel(raceCode as number)}</span>
            )}
            {raceTemp != null && (
              <span className="text-sm text-foreground">{Math.round(raceTemp as number)}°C</span>
            )}
            {rainProb != null && rainProb > 20 && (
              <Badge className="bg-blue-900/60 text-blue-300 border-blue-800 text-xs">
                {rainProb}% rain
              </Badge>
            )}
          </div>
        )}

        {coords && (
          <p className="text-xs text-muted-foreground/50">
            {coords.lat.toFixed(3)}°, {coords.lng.toFixed(3)}°
          </p>
        )}
      </CardContent>
      </div>
    </Card>
  );
}
