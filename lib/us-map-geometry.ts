import { US_MAP_SVG } from "../components/us-map-svg";
import { STATE_BOUNDS } from "./state-bounds";

export const MAP_VIEWBOX = { width: 959, height: 593 };

type Point = { x: number; y: number };
type Circle = { cx: number; cy: number; r: number };
type BBox = { minX: number; minY: number; maxX: number; maxY: number };

type Shape = {
  code: string;
  rings: Point[][];
  circles: Circle[];
  bbox: BBox;
  interior: Point;
};

export type MapPoint = { x: number; y: number; clamped: boolean };

const shapes = new Map<string, Shape>();
let ready = false;

function attr(source: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(source)?.[1];
}

function parsePath(d: string): Point[][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const rings: Point[][] = [];
  let ring: Point[] = [];
  let index = 0;
  let command = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  function take(): number {
    const value = Number(tokens[index]);
    index += 1;
    return value;
  }

  function close() {
    if (ring.length) rings.push(ring);
    ring = [];
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/[a-zA-Z]/.test(token)) {
      command = token;
      index += 1;
      if (command === "z" || command === "Z") {
        close();
        cx = sx;
        cy = sy;
      }
      continue;
    }
    if (command === "m" || command === "M") {
      const x = take();
      const y = take();
      if (command === "m") {
        cx += x;
        cy += y;
      } else {
        cx = x;
        cy = y;
      }
      if (ring.length) close();
      sx = cx;
      sy = cy;
      ring = [{ x: cx, y: cy }];
      command = command === "m" ? "l" : "L";
      continue;
    }
    if (command === "l" || command === "L") {
      const x = take();
      const y = take();
      if (command === "l") {
        cx += x;
        cy += y;
      } else {
        cx = x;
        cy = y;
      }
      ring.push({ x: cx, y: cy });
      continue;
    }
    if (command === "h" || command === "H") {
      const x = take();
      cx = command === "h" ? cx + x : x;
      ring.push({ x: cx, y: cy });
      continue;
    }
    if (command === "v" || command === "V") {
      const y = take();
      cy = command === "v" ? cy + y : y;
      ring.push({ x: cx, y: cy });
      continue;
    }
    throw new Error(`Unsupported map path command ${command || "(none)"}`);
  }
  close();
  return rings;
}

function inRing(x: number, y: number, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    const crosses = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function contains(shape: Shape, x: number, y: number): boolean {
  for (const circle of shape.circles) {
    const dx = x - circle.cx;
    const dy = y - circle.cy;
    if (dx * dx + dy * dy <= circle.r * circle.r) return true;
  }
  let inside = false;
  for (const ring of shape.rings) {
    if (ring.length >= 3 && inRing(x, y, ring)) inside = !inside;
  }
  return inside;
}

function interiorOf(shape: Shape): Point {
  const circle = shape.circles[0];
  if (shape.code === "dc" && circle) return { x: circle.cx, y: circle.cy };
  const { minX, minY, maxX, maxY } = shape.bbox;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let best: Point | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  const steps = 28;
  for (let row = 0; row <= steps; row += 1) {
    for (let column = 0; column <= steps; column += 1) {
      const x = minX + ((maxX - minX) * column) / steps;
      const y = minY + ((maxY - minY) * row) / steps;
      if (!contains(shape, x, y)) continue;
      const distance = (x - cx) ** 2 + (y - cy) ** 2;
      if (distance < bestDistance) {
        best = { x, y };
        bestDistance = distance;
      }
    }
  }
  return best ?? { x: cx, y: cy };
}

function loadShapes() {
  if (ready) return;
  const found = new Map<string, { rings: Point[][]; circles: Circle[] }>();
  const tags = US_MAP_SVG.match(/<(?:path|circle)\b[^>]*>/g) ?? [];
  for (const tag of tags) {
    const code = attr(tag, "data-code");
    if (!code) continue;
    const bucket = found.get(code) ?? { rings: [], circles: [] };
    if (tag.startsWith("<circle")) {
      const cx = Number(attr(tag, "cx"));
      const cy = Number(attr(tag, "cy"));
      const r = Number(attr(tag, "r"));
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) bucket.circles.push({ cx, cy, r });
    } else {
      const d = attr(tag, "d");
      if (d) bucket.rings.push(...parsePath(d));
    }
    found.set(code, bucket);
  }
  for (const [code, bucket] of found) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const ring of bucket.rings) {
      for (const point of ring) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    for (const circle of bucket.circles) {
      minX = Math.min(minX, circle.cx - circle.r);
      minY = Math.min(minY, circle.cy - circle.r);
      maxX = Math.max(maxX, circle.cx + circle.r);
      maxY = Math.max(maxY, circle.cy + circle.r);
    }
    const shape: Shape = {
      code,
      rings: bucket.rings,
      circles: bucket.circles,
      bbox: { minX, minY, maxX, maxY },
      interior: { x: 0, y: 0 },
    };
    shape.interior = interiorOf(shape);
    shapes.set(code, shape);
  }
  ready = true;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function settle(shape: Shape, x: number, y: number): MapPoint {
  if (contains(shape, x, y)) return { x: round(x), y: round(y), clamped: false };
  const inner = shape.interior;
  for (let step = 1; step <= 24; step += 1) {
    const t = step / 24;
    const px = x + (inner.x - x) * t;
    const py = y + (inner.y - y) * t;
    if (contains(shape, px, py)) return { x: round(px), y: round(py), clamped: true };
  }
  return { x: round(inner.x), y: round(inner.y), clamped: true };
}

export function mapShapeCodes(): string[] {
  loadShapes();
  return [...shapes.keys()];
}

/** Lat/lng onto the decorative state shape. Points that miss the shape move onto it. */
export function projectToState(code: string, lat: number, lng: number): MapPoint {
  loadShapes();
  const shape = shapes.get(code.toLowerCase());
  if (!shape) throw new Error(`No map shape for ${code}`);
  if (code.toUpperCase() === "DC" && shape.circles[0]) {
    return { x: round(shape.circles[0].cx), y: round(shape.circles[0].cy), clamped: false };
  }
  const box = STATE_BOUNDS[code.toUpperCase()];
  if (!box) throw new Error(`No bounds for ${code}`);
  const lngN = code.toUpperCase() === "AK" && lng > 0 ? lng - 360 : lng;
  const nx = clamp01((lngN - box.minLng) / (box.maxLng - box.minLng));
  const ny = clamp01((box.maxLat - lat) / (box.maxLat - box.minLat));
  const x = shape.bbox.minX + nx * (shape.bbox.maxX - shape.bbox.minX);
  const y = shape.bbox.minY + ny * (shape.bbox.maxY - shape.bbox.minY);
  return settle(shape, x, y);
}

export function moveInsideState(code: string, x: number, y: number): MapPoint {
  loadShapes();
  const shape = shapes.get(code.toLowerCase());
  if (!shape) throw new Error(`No map shape for ${code}`);
  return settle(shape, x, y);
}
