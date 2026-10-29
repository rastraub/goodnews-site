"use client";

import { useRouter } from "next/navigation";
import { renderUsMap } from "@/components/us-map";
import { heroesPath } from "@/lib/heroes";
import { getStateByCode, stateName, STATES } from "@/lib/states";

export function HeroesMap({
  highlighted,
  selected,
  type,
}: {
  highlighted: string[];
  selected: string;
  type: string;
}) {
  const router = useRouter();
  let markup = renderUsMap(selected ? selected.toLowerCase() : undefined, highlighted);
  for (const item of STATES) {
    markup = markup.replaceAll(`href="/state/${item.slug}"`, `href="${heroesPath(type, item.code)}"`);
  }

  function onMapClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const link = (event.target as Element).closest("a.state-link");
    if (!(link instanceof HTMLAnchorElement)) return;
    event.preventDefault();
    const code = (link.dataset.state ?? "").toUpperCase();
    if (!getStateByCode(code)) return;
    router.push(heroesPath(type, selected === code ? "" : code), { scroll: false });
  }

  return (
    <div className="heroes-map">
      <div className="map">
        <div className="map-canvas" onClick={onMapClick} dangerouslySetInnerHTML={{ __html: markup }} />
        <div className="map-legend">
          <span>
            <i style={{ background: "#FFD36E" }} />
            Has a story
          </span>
          {selected ? (
            <span>
              <i style={{ background: "#F3B23C" }} />
              {stateName(selected)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
