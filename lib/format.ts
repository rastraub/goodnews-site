export function formatStoryDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function editionLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(now);
}

export function editionYear(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "America/New_York",
    }).format(now),
  );
}

export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function emphatic(title: string, emphasis?: string): { before: string; em?: string; after?: string } {
  if (!emphasis) return { before: title };
  const index = title.indexOf(emphasis);
  if (index < 0) return { before: title };
  return {
    before: title.slice(0, index),
    em: emphasis,
    after: title.slice(index + emphasis.length),
  };
}
