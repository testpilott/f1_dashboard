"use client";

import { useNow } from "@/lib/hooks/useNow";
import { formatCountdown } from "@/lib/time/format";

export default function Countdown({ target }: { target: Date }) {
  const now = useNow();
  if (now === null) return null;
  const remaining = target.getTime() - now;
  if (remaining <= 0) return <span className="text-primary font-mono text-xs">Starting…</span>;
  return (
    <span className="text-primary font-mono text-xs tabular-nums">
      {formatCountdown(remaining)}
    </span>
  );
}
