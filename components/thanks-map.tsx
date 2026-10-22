import { US_MAP_SVG } from "./us-map-svg";
import type { ThanksSlot } from "@/lib/thanks";

function markFilled(svg: string, code: string) {
  const lower = code.toLowerCase();
  let next = svg.replaceAll(`class="${lower}" data-code="${lower}"`, `class="${lower} hl" data-code="${lower}"`);
  if (lower === "dc") {
    next = next.replaceAll(
      `class="state borders dccircle dc" data-code="dc"`,
      `class="state borders dccircle dc hl" data-code="dc"`,
    );
  }
  return next;
}

export function ThanksMap({ slots }: { slots: ThanksSlot[] }) {
  let svg = US_MAP_SVG;
  for (const slot of slots) {
    svg = svg.replaceAll(`href="/state/${slot.state.slug}"`, `href="#thanks-${slot.state.slug}"`);
    if (slot.story) svg = markFilled(svg, slot.state.code);
  }

  return (
    <div className="map thanks-map">
      <div className="map-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="map-legend">
        <span>
          <i style={{ background: "#FFD36E" }} />
          Story ready
        </span>
        <span>
          <i style={{ background: "#FFFFFF", boxShadow: "inset 0 0 0 1px #CFE0F0" }} />
          Send us one
        </span>
      </div>
    </div>
  );
}
