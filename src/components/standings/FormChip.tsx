import type { DriverForm } from "@/lib/stats/form";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function FormChip({ form }: { form?: DriverForm }) {
  if (!form || form.races === 0)
    return <span className="text-muted-foreground/60 text-xs" aria-hidden="true">—</span>;

  const { trend, avgPoints, races } = form;
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const tone =
    trend === "up"
      ? "text-chart-5"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1 ${tone}`}
      title={`Form over last ${races} race${races === 1 ? "" : "s"}: ${avgPoints.toFixed(1)} avg pts, trend ${trend}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="font-mono text-xs tabular-nums">{avgPoints.toFixed(1)}</span>
    </span>
  );
}