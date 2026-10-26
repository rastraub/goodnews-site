"use client";

import { useMemo } from "react";
import { renderUsMap } from "./us-map";

export function GivingMap({ highlighted, gapCount }: { highlighted: string[]; gapCount: number }) {
  const key = highlighted.join(",");
  const markup = useMemo(() => {
    const painted = renderUsMap(
      undefined,
      key ? key.split(",") : [],
    );
    return painted.replaceAll('href="/state/', 'href="#');
  }, [key]);

  return (
    <div className="map give-map">
      <div className="map-canvas" dangerouslySetInnerHTML={{ __html: markup }} />
      <div className="map-legend">
        <span>
          <i style={{ background: "#FFD36E" }} />
          Way to help
        </span>
        {gapCount > 0 ? (
          <span>
            <i style={{ background: "#fff", boxShadow: "inset 0 0 0 1px #CFE0F0" }} />
            No pick yet
          </span>
        ) : null}
      </div>
    </div>
  );
}
