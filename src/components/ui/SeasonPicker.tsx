"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEASONS = Array.from({ length: 6 }, (_, i) => String(2026 - i)); // 2026–2021

export default function SeasonPicker({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "current") {
      params.delete("season");
    } else {
      params.set("season", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const display = current === "current" ? "2026" : current;

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-28 bg-surface-2 border-border text-sm h-8">
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-surface-2 border-border">
        {SEASONS.map((yr) => (
          <SelectItem key={yr} value={yr === "2026" ? "current" : yr}>
            {yr}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
