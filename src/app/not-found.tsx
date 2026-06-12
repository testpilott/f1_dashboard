import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          404 · Page not found
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          That page doesn&apos;t exist, has moved, or the season hasn&apos;t happened yet.
        </p>
      </div>
      <Link
        href="/schedule"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Back to the schedule
      </Link>
    </div>
  );
}
