/**
 * Used only when the story's own city key is missing from the gazetteer.
 * Targets are keys in data/us-places.json, which are Census names.
 * Boroughs and a few neighborhoods are not separate places in that file.
 */
export const PLACE_ALIASES: Record<string, Record<string, string>> = {
  HI: { honolulu: "urban honolulu" },
  NY: {
    "new york city": "new york",
    nyc: "new york",
    "the bronx": "bronx county",
    bronx: "bronx county",
    "staten island": "richmond county",
    astoria: "queens county",
  },
  CA: { "north hills": "los angeles" },
  TN: { madison: "nashville" },
};
