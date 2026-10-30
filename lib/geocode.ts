import fs from "fs";
import path from "path";
import { cityKey } from "./cities";
import { PLACE_ALIASES } from "./place-aliases";
import { STATE_BOUNDS } from "./state-bounds";

export type PlacePrecision = "city" | "state" | "given";

export type PlaceHit = {
  lat: number;
  lng: number;
  precision: PlacePrecision;
};

type PlaceFile = {
  states: Record<string, { lat: number; lng: number }>;
  places: Record<string, Record<string, [number, number]>>;
};

let file: PlaceFile | null = null;

function loadPlaces(): PlaceFile {
  if (!file) {
    const raw = fs.readFileSync(path.join(process.cwd(), "data/us-places.json"), "utf8");
    file = JSON.parse(raw) as PlaceFile;
  }
  return file;
}

function lookupKeys(city: string): string[] {
  const key = cityKey(city);
  if (!key) return [];
  const keys = [key];
  if (key.includes(" s ")) keys.push(key.replaceAll(" s ", "s "));
  return keys;
}

/**
 * City and state coordinates from the bundled Census gazetteer.
 * A latitude and longitude on the story win. An unknown city uses the state internal point.
 */
export function geocodeUsPlace(
  state: string,
  city: string,
  given?: { latitude?: number; longitude?: number },
): PlaceHit {
  const code = state.toUpperCase();
  if (given?.latitude !== undefined && given.longitude !== undefined) {
    return { lat: given.latitude, lng: given.longitude, precision: "given" };
  }
  const data = loadPlaces();
  const bucket = data.places[code] ?? {};
  const aliases = PLACE_ALIASES[code] ?? {};
  for (const key of lookupKeys(city)) {
    const direct = bucket[key];
    if (direct) return { lat: direct[0], lng: direct[1], precision: "city" };
    const alias = aliases[key];
    const aliased = alias ? bucket[alias] : undefined;
    if (aliased) return { lat: aliased[0], lng: aliased[1], precision: "city" };
  }
  const center = data.states[code];
  if (center) return { lat: center.lat, lng: center.lng, precision: "state" };
  const box = STATE_BOUNDS[code];
  if (!box) return { lat: 39.8, lng: -98.6, precision: "state" };
  return { lat: (box.minLat + box.maxLat) / 2, lng: (box.minLng + box.maxLng) / 2, precision: "state" };
}
