import { US_MAP_SVG } from "./us-map-svg";
import type { IndexStateRow } from "@/lib/good-news-index";

export function bandFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mapLabel(state: IndexStateRow): string {
  const stories = state.stories === 1 ? "1 story" : `${state.stories} stories`;
  if (!state.rank) return `${state.name}, ${stories}`;
  return `${state.name}, ${stories}, ${state.rankLabel}, ${state.perMillionLabel} per 1 million residents`;
}

/** The homepage map, recolored for one edition. Each state keeps its link to the state page. */
export function renderIndexMap(states: IndexStateRow[]): string {
  const max = states.reduce((peak, state) => Math.max(peak, state.stories), 0);
  let svg = US_MAP_SVG;
  for (const state of states) {
    const code = state.code.toLowerCase();
    const band = bandFor(state.stories, max);
    const label = escapeXml(mapLabel(state));
    svg = svg.replaceAll(`aria-label="${state.name}"`, `aria-label="${label}"`);
    svg = svg.replaceAll(`<title>${state.name}</title>`, `<title>${label}</title>`);
    svg = svg.replaceAll(`class="${code}" data-code="${code}"`, `class="${code} band-${band}" data-code="${code}"`);
    if (code === "dc") {
      svg = svg.replaceAll(
        `class="state borders dccircle dc" data-code="dc"`,
        `class="state borders dccircle dc band-${band}" data-code="dc"`,
      );
    }
  }
  return svg;
}

export function indexMapLegend(states: IndexStateRow[]): { band: number; label: string }[] {
  const max = states.reduce((peak, state) => Math.max(peak, state.stories), 0);
  const names = ["No stories", "Fewer stories", "Middle", "More stories", "Most stories"];
  const groups = new Map<number, number[]>([
    [0, []],
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);
  for (const state of states) {
    groups.get(bandFor(state.stories, max))?.push(state.stories);
  }
  return [0, 1, 2, 3, 4].flatMap((band) => {
    const counts = groups.get(band) ?? [];
    if (!counts.length) return [];
    const min = Math.min(...counts);
    const peak = Math.max(...counts);
    const range = min === peak ? String(min) : `${min}–${peak}`;
    const noun = peak === 1 ? "story" : "stories";
    return [{ band, label: `${names[band]} (${range} ${noun})` }];
  });
}

export function IndexMap({ states }: { states: IndexStateRow[] }) {
  const legend = indexMapLegend(states);
  return (
    <figure className="index-map">
      <div dangerouslySetInnerHTML={{ __html: renderIndexMap(states) }} />
      <figcaption>
        <ul className="index-legend">
          {legend.map((item) => (
            <li key={item.band}>
              <i className={`swatch band-${item.band}`} />
              {item.label}
            </li>
          ))}
        </ul>
        <p>Darker gold means more stories published in this edition, compared with the busiest state. The table has the exact count. Each state opens its own page.</p>
      </figcaption>
    </figure>
  );
}
