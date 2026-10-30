/**
 * Builds data/us-places.json and lib/state-bounds.ts from Census Gazetteer
 * files in data/source/. Those files are public domain. The site reads the
 * result at build time. It does not call a geocoding service.
 *
 * Download the 2024 national Gazetteer zips for places, states, counties,
 * and county subdivisions into data/source/, unzip them, then run:
 *   npx tsx scripts/build-place-index.ts
 */
import fs from "fs";
import path from "path";
import { cityKey } from "../lib/cities";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/source");
const OUT = path.join(ROOT, "data/us-places.json");
const BOUNDS_OUT = path.join(ROOT, "lib/state-bounds.ts");

const KEEP = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

const LSAD_RANK: Record<string, number> = {
  "25": 1,
  "43": 2,
  "21": 3,
  "47": 4,
  "37": 5,
  "53": 6,
  "55": 7,
  "00": 8,
  UC: 8,
  MG: 8,
  "57": 30,
};

const GOVERNMENT_SUFFIXES = [
  " metropolitan government",
  " consolidated government",
  " unified government",
  " metro government",
  " urban county",
];

const TYPE_SUFFIXES = [
  " city and borough",
  " unorganized territory",
  " municipality",
  " corporation",
  " comunidad",
  " plantation",
  " township",
  " borough",
  " village",
  " purchase",
  " location",
  " precinct",
  " grant",
  " gore",
  " CDP",
  " CCD",
  " city",
  " town",
  " UT",
];

type Row = { lat: number; lng: number; rank: number; area: number; active: boolean; tier: number };

function parseTable(file: string): Record<string, string>[] {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  const header = lines[0].trim().split("\t").map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cells = line.trim().split("\t");
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = (cells[index] ?? "").trim();
    });
    return row;
  });
}

function normLng(state: string, lng: number): number {
  if (state === "AK" && lng > 0) return lng - 360;
  return lng;
}

function stripOnce(text: string, suffixes: string[]): string {
  const lower = text.toLowerCase();
  const suffix = suffixes.find((item) => lower.endsWith(item.toLowerCase()));
  if (!suffix) return text;
  return text.slice(0, -suffix.length).trim();
}

function stripName(name: string): { stripped: string; government: boolean } {
  const government = /urban county|metropolitan government|consolidated government|metro government|unified government|\(balance\)/i.test(name);
  let text = name.replace(/ \(balance\)$/i, "").trim();
  text = stripOnce(text, GOVERNMENT_SUFFIXES);
  text = stripOnce(text, TYPE_SUFFIXES);
  return { stripped: text, government };
}

function keysFor(name: string): string[] {
  const { stripped, government } = stripName(name);
  const keys = new Set<string>();
  const full = cityKey(name.replace(/ \(balance\)$/i, ""));
  const bare = cityKey(stripped);
  if (full) keys.add(full);
  if (bare) keys.add(bare);
  if (government) {
    const head = stripped.split(/[/-]/)[0]?.trim() ?? "";
    const headKey = cityKey(head);
    if (headKey) keys.add(headKey);
  }
  return [...keys];
}

function better(next: Row, prev: Row): boolean {
  if (next.tier !== prev.tier) return next.tier < prev.tier;
  if (next.active !== prev.active) return next.active;
  if (!next.active && !prev.active && prev.area > 0 && next.area > prev.area * 3) return true;
  if (next.rank !== prev.rank) return next.rank < prev.rank;
  return next.area > prev.area;
}

function remember(chosen: Map<string, Row>, state: string, key: string, row: Row) {
  const id = `${state}|${key}`;
  const prev = chosen.get(id);
  if (!prev || better(row, prev)) chosen.set(id, row);
}

function main() {
  const placeFile = path.join(SOURCE, "2024_Gaz_place_national.txt");
  const stateFile = path.join(SOURCE, "2024_Gaz_state_national.txt");
  const countyFile = path.join(SOURCE, "2024_Gaz_counties_national.txt");
  const cousubFile = path.join(SOURCE, "2024_Gaz_cousubs_national.txt");
  for (const file of [placeFile, stateFile, countyFile, cousubFile]) {
    if (!fs.existsSync(file)) throw new Error(`Missing ${path.relative(ROOT, file)}. See the comment at the top of this script.`);
  }

  const states: Record<string, { lat: number; lng: number }> = {};
  for (const row of parseTable(stateFile)) {
    if (!KEEP.has(row.USPS)) continue;
    states[row.USPS] = { lat: Number(row.INTPTLAT), lng: Number(row.INTPTLONG) };
  }

  const chosen = new Map<string, Row>();

  const cousubKeys = new Map<string, number>();
  const cousubRows: { state: string; keys: string[]; row: Row }[] = [];
  for (const raw of parseTable(cousubFile)) {
    if (!KEEP.has(raw.USPS)) continue;
    const lat = Number(raw.INTPTLAT);
    const lng = normLng(raw.USPS, Number(raw.INTPTLONG));
    if (raw.FUNCSTAT === "S") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const keys = keysFor(raw.NAME);
    const row: Row = {
      lat,
      lng,
      rank: 40,
      area: Number(raw.ALAND) || 0,
      active: raw.FUNCSTAT === "A",
      tier: 2,
    };
    cousubRows.push({ state: raw.USPS, keys, row });
    for (const key of keys) {
      const id = `${raw.USPS}|${key}`;
      cousubKeys.set(id, (cousubKeys.get(id) ?? 0) + 1);
    }
  }
  for (const item of cousubRows) {
    for (const key of item.keys) {
      if ((cousubKeys.get(`${item.state}|${key}`) ?? 0) !== 1) continue;
      remember(chosen, item.state, key, item.row);
    }
  }

  for (const raw of parseTable(countyFile)) {
    if (!KEEP.has(raw.USPS)) continue;
    const lat = Number(raw.INTPTLAT);
    const lng = normLng(raw.USPS, Number(raw.INTPTLONG));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = cityKey(raw.NAME);
    if (!key) continue;
    remember(chosen, raw.USPS, key, {
      lat,
      lng,
      rank: 50,
      area: Number(raw.ALAND) || 0,
      active: true,
      tier: 3,
    });
  }

  for (const raw of parseTable(placeFile)) {
    if (!KEEP.has(raw.USPS)) continue;
    const lat = Number(raw.INTPTLAT);
    const lng = normLng(raw.USPS, Number(raw.INTPTLONG));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const row: Row = {
      lat,
      lng,
      rank: LSAD_RANK[raw.LSAD] ?? 15,
      area: Number(raw.ALAND) || 0,
      active: raw.FUNCSTAT === "A",
      tier: 1,
    };
    for (const key of keysFor(raw.NAME)) remember(chosen, raw.USPS, key, row);
  }

  const places: Record<string, Record<string, [number, number]>> = {};
  const extent = new Map<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }>();
  function grow(state: string, lat: number, lng: number) {
    const box = extent.get(state) ?? { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng };
    box.minLat = Math.min(box.minLat, lat);
    box.maxLat = Math.max(box.maxLat, lat);
    box.minLng = Math.min(box.minLng, lng);
    box.maxLng = Math.max(box.maxLng, lng);
    extent.set(state, box);
  }

  for (const [id, row] of chosen) {
    const splitAt = id.indexOf("|");
    const state = id.slice(0, splitAt);
    const key = id.slice(splitAt + 1);
    const bucket = places[state] ?? {};
    bucket[key] = [Math.round(row.lat * 10000) / 10000, Math.round(row.lng * 10000) / 10000];
    places[state] = bucket;
    grow(state, row.lat, row.lng);
  }
  for (const [code, point] of Object.entries(states)) grow(code, point.lat, normLng(code, point.lng));

  const required: [string, string][] = [
    ["CO", "denver"],
    ["IN", "indianapolis"],
    ["KY", "lexington"],
    ["TN", "nashville"],
    ["MT", "butte"],
    ["NY", "new york"],
    ["NY", "bronx county"],
    ["NY", "richmond county"],
    ["NY", "queens county"],
    ["HI", "urban honolulu"],
    ["AK", "anchorage"],
    ["MA", "concord"],
    ["SC", "lexington county"],
    ["NH", "beans purchase"],
  ];
  for (const [state, key] of required) {
    if (!places[state]?.[key]) throw new Error(`Gazetteer is missing ${state} ${key}.`);
  }

  const smallPad: Record<string, number> = { DC: 0.15, RI: 0.22, DE: 0.28, CT: 0.28 };
  const boundLines = [...KEEP].sort().map((code) => {
    const box = extent.get(code);
    if (!box) throw new Error(`No coordinates for ${code}.`);
    const pad = smallPad[code] ?? 0.5;
    const minLat = (box.minLat - pad).toFixed(2);
    const maxLat = (box.maxLat + pad).toFixed(2);
    const minLng = (box.minLng - pad).toFixed(2);
    const maxLng = (box.maxLng + pad).toFixed(2);
    return `  ${code}: { minLat: ${minLat}, maxLat: ${maxLat}, minLng: ${minLng}, maxLng: ${maxLng} },`;
  });

  const payload = {
    source: "U.S. Census Bureau 2024 Gazetteer internal points for places, county subdivisions, and counties. Public domain.",
    states,
    places,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
  fs.writeFileSync(
    BOUNDS_OUT,
    `// Generated by scripts/build-place-index.ts from the Census Gazetteer. Do not edit by hand.
// Boxes are the indexed places, padded, and include each state's internal point.

export type StateBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

export const STATE_BOUNDS: Record<string, StateBounds> = {
${boundLines.join("\n")}
};

export function stateContains(code: string, lat: number, lng: number): boolean {
  const box = STATE_BOUNDS[code.toUpperCase()];
  if (!box || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const lngN = code.toUpperCase() === "AK" && lng > 0 ? lng - 360 : lng;
  return lat >= box.minLat && lat <= box.maxLat && lngN >= box.minLng && lngN <= box.maxLng;
}
`,
  );

  const count = [...Object.values(places)].reduce((sum, bucket) => sum + Object.keys(bucket).length, 0);
  console.log(`Wrote ${count} names (${fs.statSync(OUT).size} bytes) and ${path.relative(ROOT, BOUNDS_OUT)}.`);
}

main();
