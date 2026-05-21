export default function DriverBirthplace({
  city,
  wikiUrl,
}: {
  city: string | null;
  wikiUrl: string | null;
}) {
  if (!city) return null;

  return (
    <p className="text-xs text-muted-foreground pl-5">
      <span className="mr-1" aria-hidden="true">📍</span>
      {wikiUrl ? (
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {city}
        </a>
      ) : (
        city
      )}
    </p>
  );
}
