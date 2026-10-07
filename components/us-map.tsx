"use client";

import { useEffect, useMemo, useRef } from "react";
import { US_MAP_SVG } from "./us-map-svg";
import { getStateByCode } from "@/lib/states";

function paint(svg: string, code: string, cls: "hl" | "home") {
  const simple = `class="${code}" data-code="${code}"`;
  let next = svg.replaceAll(simple, `class="${code} ${cls}" data-code="${code}"`);
  if (code === "dc") {
    const circle = `class="state borders dccircle dc" data-code="dc"`;
    next = next.replaceAll(circle, `class="state borders dccircle dc ${cls}" data-code="dc"`);
  }
  return next;
}

export function renderUsMap(home: string | undefined, highlighted: string[]) {
  let svg = US_MAP_SVG;
  for (const code of highlighted) {
    if (code !== home) svg = paint(svg, code, "hl");
  }
  if (home) svg = paint(svg, home, "home");
  return svg;
}

function drawPins(root: HTMLDivElement, home: string | undefined, highlighted: string[]) {
  const svg = root.querySelector("svg");
  const pins = svg?.querySelector("#pins");
  if (!svg || !pins) return;
  pins.replaceChildren();
  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const codes = [...new Set([...(home ? [home] : []), ...highlighted])];
  const scale = mobile ? 1.6 : 1.2;

  for (const code of codes) {
    const shapes = [...svg.querySelectorAll(`[data-code="${code}"]`)];
    const shape = shapes.find((element) => element.tagName === "path") ?? shapes[0];
    if (!shape || !(shape instanceof SVGGraphicsElement)) continue;
    const box = shape.getBBox();
    let x = box.x + box.width / 2;
    let y = box.y + box.height / 2;
    if (code === "fl") {
      x = box.x + box.width * 0.72;
      y = box.y + box.height * 0.55;
    }
    if (code === "ma") {
      x = box.x + box.width * 0.45;
      y = box.y + box.height * 0.5;
    }
    if (code === "id") y = box.y + box.height * 0.62;
    if (code === "wa") y = box.y + box.height * 0.42;

    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", "pin");
    const halo = document.createElementNS(NS, "circle");
    halo.setAttribute("class", "halo");
    halo.setAttribute("cx", String(x));
    halo.setAttribute("cy", String(y));
    halo.setAttribute("r", String(16 * scale));
    const core = document.createElementNS(NS, "circle");
    core.setAttribute("class", "core");
    core.setAttribute("cx", String(x));
    core.setAttribute("cy", String(y));
    core.setAttribute("r", String(6 * scale));
    group.append(halo, core);

    const isHome = code === home;
    if (!mobile || isHome) {
      const name = getStateByCode(code)?.name ?? code.toUpperCase();
      const text = document.createElementNS(NS, "text");
      text.textContent = isHome ? `${name} · you` : name;
      let tx = x + 16 * scale;
      let ty = y - 12 * scale;
      if (code === "ma") {
        tx = x - 10;
        ty = y - 28;
        text.setAttribute("text-anchor", "end");
      }
      if (code === "fl") {
        tx = x + 18;
        ty = y + 6;
      }
      if (code === "wa") {
        tx = x - 8;
        ty = y + 36;
        text.setAttribute("text-anchor", "end");
      }
      if (code === "id") {
        tx = x + 16;
        ty = y - 16;
      }
      text.setAttribute("x", String(tx));
      text.setAttribute("y", String(ty));
      group.append(text);
      const bounds = text.getBBox();
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", String(bounds.x - 8));
      rect.setAttribute("y", String(bounds.y - 4));
      rect.setAttribute("width", String(bounds.width + 16));
      rect.setAttribute("height", String(bounds.height + 8));
      rect.setAttribute("rx", String((bounds.height + 8) / 2));
      group.insertBefore(rect, text);
    }
    pins.append(group);
  }
}

export function UsMap({ home, highlighted }: { home?: string; highlighted: string[] }) {
  const markup = useMemo(() => renderUsMap(home?.toLowerCase(), highlighted.map((code) => code.toLowerCase())), [home, highlighted]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const homeCode = home?.toLowerCase();
    const codes = highlighted.map((code) => code.toLowerCase());
    const draw = () => drawPins(root, homeCode, codes);
    draw();
    const media = window.matchMedia("(max-width: 700px)");
    media.addEventListener("change", draw);
    window.addEventListener("resize", draw);
    return () => {
      media.removeEventListener("change", draw);
      window.removeEventListener("resize", draw);
    };
  }, [markup, home, highlighted]);

  return (
    <div className="map">
      <div className="map-canvas" ref={ref} dangerouslySetInnerHTML={{ __html: markup }} />
      <div className="map-legend">
        <span>
          <i style={{ background: "#FFD36E" }} />
          New today
        </span>
        <span>
          <i style={{ background: "#F3B23C" }} />
          Your state
        </span>
      </div>
    </div>
  );
}
