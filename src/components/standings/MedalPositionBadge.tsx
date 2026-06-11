import { Badge } from "@/components/ui/badge";

// Not interchangeable with compare/PositionBadge: this is the medal-style standings badge.
const MEDAL: Record<number, string> = {
  1: "bg-medal-gold text-medal-foreground",
  2: "bg-medal-silver text-medal-foreground",
  3: "bg-medal-bronze text-medal-foreground",
};

export default function MedalPositionBadge({ pos }: { pos: number }) {
  const medal = MEDAL[pos];
  if (medal)
    return (
      <Badge className={`${medal} font-bold w-7 h-7 flex items-center justify-center rounded-full p-0 tabular-nums`}>
        {pos}
      </Badge>
    );
  return <span className="text-muted-foreground font-mono text-sm w-7 inline-flex justify-center tabular-nums">{pos}</span>;
}
