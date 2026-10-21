/**
 * July 1, 2024 resident population for the 50 states and the District of Columbia.
 * Puerto Rico is not a state page on this site, so it is not in this table.
 *
 * Source: U.S. Census Bureau, Population Division.
 * Annual Estimates of the Resident Population for the United States, Regions,
 * States, District of Columbia, and Puerto Rico: April 1, 2020 to July 1, 2024
 * (NST-EST2024-POP). Release date: December 2024.
 * https://www2.census.gov/programs-surveys/popest/tables/2020-2024/state/totals/NST-EST2024-POP.xlsx
 *
 * The press kit for that release:
 * https://www.census.gov/newsroom/press-kits/2024/national-state-population-estimates.html
 *
 * These are estimates, not the April 1, 2020 Census count. The Good News Index
 * uses them as a fixed denominator. Replacing them moves every edition, including
 * closed months, so do that only on purpose and say so in the methodology.
 */
export const POPULATION_AS_OF = "2024-07-01";
export const POPULATION_TABLE = "NST-EST2024-POP";
export const POPULATION_RELEASE = "December 2024";

export const POPULATION_CITATION =
  "U.S. Census Bureau, Population Division. Annual Estimates of the Resident Population for the United States, Regions, States, District of Columbia, and Puerto Rico: April 1, 2020 to July 1, 2024 (NST-EST2024-POP). Release date: December 2024.";

export const POPULATION_URL =
  "https://www2.census.gov/programs-surveys/popest/tables/2020-2024/state/totals/NST-EST2024-POP.xlsx";

/** July 1, 2024 resident population of the 50 states plus the District of Columbia. */
export const POPULATION_US_TOTAL = 340_110_988;

export const POPULATION_JULY_2024 = {
  AL: 5_157_699,
  AK: 740_133,
  AZ: 7_582_384,
  AR: 3_088_354,
  CA: 39_431_263,
  CO: 5_957_493,
  CT: 3_675_069,
  DE: 1_051_917,
  DC: 702_250,
  FL: 23_372_215,
  GA: 11_180_878,
  HI: 1_446_146,
  ID: 2_001_619,
  IL: 12_710_158,
  IN: 6_924_275,
  IA: 3_241_488,
  KS: 2_970_606,
  KY: 4_588_372,
  LA: 4_597_740,
  ME: 1_405_012,
  MD: 6_263_220,
  MA: 7_136_171,
  MI: 10_140_459,
  MN: 5_793_151,
  MS: 2_943_045,
  MO: 6_245_466,
  MT: 1_137_233,
  NE: 2_005_465,
  NV: 3_267_467,
  NH: 1_409_032,
  NJ: 9_500_851,
  NM: 2_130_256,
  NY: 19_867_248,
  NC: 11_046_024,
  ND: 796_568,
  OH: 11_883_304,
  OK: 4_095_393,
  OR: 4_272_371,
  PA: 13_078_751,
  RI: 1_112_308,
  SC: 5_478_831,
  SD: 924_669,
  TN: 7_227_750,
  TX: 31_290_831,
  UT: 3_503_613,
  VT: 648_493,
  VA: 8_811_195,
  WA: 7_958_180,
  WV: 1_769_979,
  WI: 5_960_975,
  WY: 587_618,
} as const;

export type PopulationCode = keyof typeof POPULATION_JULY_2024;

export function populationOf(code: string): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(POPULATION_JULY_2024, code)) return undefined;
  return POPULATION_JULY_2024[code as PopulationCode];
}

export function populationTotal(): number {
  return Object.values(POPULATION_JULY_2024).reduce((sum, value) => sum + value, 0);
}
