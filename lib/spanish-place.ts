import { countryName } from "./countries";
import type { Story } from "./stories";

/**
 * US state names in neutral Latin American Spanish.
 * Cities stay as published. Countries come from Intl so a new country does not need a handwritten row.
 */
const STATE_NAMES_ES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "Distrito de Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawái",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Luisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Míchigan",
  MN: "Minnesota",
  MS: "Misisipi",
  MO: "Misuri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "Nuevo Hampshire",
  NJ: "Nueva Jersey",
  NM: "Nuevo México",
  NY: "Nueva York",
  NC: "Carolina del Norte",
  ND: "Dakota del Norte",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregón",
  PA: "Pensilvania",
  RI: "Rhode Island",
  SC: "Carolina del Sur",
  SD: "Dakota del Sur",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "Virginia Occidental",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const countryNames = new Intl.DisplayNames(["es-419"], { type: "region" });

export function spanishStateName(code: string | undefined): string {
  if (!code) return "";
  return STATE_NAMES_ES[code] ?? "";
}

export function spanishCountryName(code: string): string {
  return countryNames.of(code) ?? countryName(code);
}

/** City plus state, or city plus country. The city string is the one on the story. */
export function spanishPlaceLabel(story: Pick<Story, "city" | "state" | "country">): string {
  if (story.country === "US") {
    const state = spanishStateName(story.state);
    return state ? `${story.city}, ${state}` : story.city;
  }
  const country = spanishCountryName(story.country);
  return story.city ? `${story.city}, ${country}` : country;
}
