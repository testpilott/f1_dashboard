import { Radio } from "lucide-react";

type DriverQuote = {
  text: string;
  source: {
    race: string;
    year: number;
  };
};

export default function DriverQuotesSection({
  quotes,
  color,
}: {
  quotes: DriverQuote[];
  color: string;
}) {
  return (
    <div className="py-3.5">
      <div className="flex items-center gap-1.5 mb-3 px-5">
        <Radio size={13} className="text-chart-5 shrink-0" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Memorable Quotes
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-5">
        {quotes.map((quote, i) => (
          <div
            key={i}
            className="min-w-[220px] max-w-[260px] snap-start flex-shrink-0 bg-surface-3/60 rounded-lg p-3"
          >
            <blockquote
              className="text-sm text-foreground/90 italic border-l-2 pl-3 leading-relaxed"
              style={{ borderLeftColor: color }}
            >
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="text-[10px] text-muted-foreground pl-3 mt-1.5">
              — {quote.source.race} · {quote.source.year}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
