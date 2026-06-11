"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RECENT_SEASONS } from "@/lib/season";

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

  const display = current === "current" ? RECENT_SEASONS[0] : current;

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-28 bg-surface-2 border-border text-sm h-8">
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-surface-2 border-border">
        {RECENT_SEASONS.map((yr, index) => (
          <SelectItem key={yr} value={index === 0 ? "current" : yr}>
            {yr}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
