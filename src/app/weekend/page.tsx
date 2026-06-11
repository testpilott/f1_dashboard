import { notFound } from "next/navigation";

// 2026-06: Weekend remains intentionally parked by product decision.
// Decision record: docs/architecture.md ("Intentional decision: Weekend route parked").
export default function WeekendPage() {
  notFound();
}
