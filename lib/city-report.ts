import type { Hub } from "./hubs";

/** One line per city, busiest first, for the daily publish log. */
export function formatCityReport(cities: Hub[]): string {
  const sorted = cities
    .slice()
    .sort((a, b) => b.count - a.count || a.linkLabel.localeCompare(b.linkLabel) || a.path.localeCompare(b.path));
  const indexable = sorted.filter((city) => city.indexable).length;
  const lines = [
    `City coverage: ${indexable} indexable, ${sorted.length - indexable} noindex. Indexable cities have 2 or more stories.`,
    "",
    ...sorted.map((city) => {
      const flag = city.indexable ? "index  " : "noindex";
      return `${String(city.count).padStart(4)}  ${flag}  ${city.linkLabel}  ${city.path}`;
    }),
  ];
  return lines.join("\n");
}
