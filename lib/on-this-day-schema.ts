import { z } from "zod";
import { calendarIso, daysInMonth, monthDayLabel, mountainIsoDay, seedWindow } from "./calendar-day";

/**
 * Hosts allowed on a milestone citation. A link has to be a specific page,
 * not a homepage, on one of these organizations. Wikipedia is a finding aid,
 * not a citation. Add a host here only when it is a reputable publisher.
 */
const SOURCE_HOST_SUFFIXES = [
  "nasa.gov",
  "si.edu",
  "smithsonianmag.com",
  "loc.gov",
  "archives.gov",
  "nps.gov",
  "noaa.gov",
  "usgs.gov",
  "nih.gov",
  "fda.gov",
  "cdc.gov",
  "epa.gov",
  "energy.gov",
  "ed.gov",
  "arts.gov",
  "neh.gov",
  "bls.gov",
  "usda.gov",
  "doi.gov",
  "fws.gov",
  "weather.gov",
  "house.gov",
  "senate.gov",
  "supremecourt.gov",
  "uscourts.gov",
  "congress.gov",
  "whitehousehistory.org",
  "mountvernon.org",
  "who.int",
  "un.org",
  "unesco.org",
  "unicef.org",
  "ohchr.org",
  "nobelprize.org",
  "icrc.org",
  "redcross.org",
  "britannica.com",
  "nationalgeographic.org",
  "nationalgeographic.com",
  "scientificamerican.com",
  "nature.com",
  "science.org",
  "sciencemag.org",
  "pnas.org",
  "thelancet.com",
  "nejm.org",
  "bmj.com",
  "royalsociety.org",
  "amnh.org",
  "nhm.ac.uk",
  "kew.org",
  "esa.int",
  "jaxa.jp",
  "isro.gov.in",
  "asc-csa.gc.ca",
  "cern.ch",
  "home.cern",
  "nytimes.com",
  "washingtonpost.com",
  "theguardian.com",
  "bbc.com",
  "bbc.co.uk",
  "npr.org",
  "reuters.com",
  "apnews.com",
  "pbs.org",
  "canada.ca",
  "gc.ca",
  "gov.uk",
  "gov.au",
  "edu",
  "ac.uk",
  "gov",
  "mil",
] as const;

const BLOCKED = /\b(killed|murder(?:ed|s)?|massacre|bomb(?:ing|ed|s)?|assassinat\w*|genocide|holocaust|suicide|rape|torture|execution|executed)\b/i;

const sourceSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    url: z.string().trim().url().max(300),
  })
  .strict();

const entrySchema = z
  .object({
    year: z.number().int().min(1).max(2100),
    text: z.string().trim().min(40).max(420),
    kidLine: z.string().trim().min(20).max(220),
    sources: z.array(sourceSchema).min(1).max(3),
  })
  .strict();

const promptSchema = z.string().trim().min(12).max(240);

const daySchema = z
  .object({
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    prompts: z.tuple([promptSchema, promptSchema]),
    entries: z.array(entrySchema).min(2).max(4),
  })
  .strict();

export const onThisDayFileSchema = z
  .object({
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    days: z.array(daySchema),
  })
  .strict();

export type OnThisDayFile = z.infer<typeof onThisDayFileSchema>;
export type OnThisDayRecord = OnThisDayFile["days"][number];
export type OnThisDayEntry = OnThisDayRecord["entries"][number];

export function sentenceCount(text: string): number {
  const normalized = text.replace(/\b(?:U\.S|U\.K|U\.N|D\.C|Dr|Mr|Mrs|Ms|St|Jr|Sr|Mt|No)\./g, (token) => token.slice(0, -1));
  return normalized.match(/[.!?](?:\s|$)/g)?.length ?? 0;
}

export function sourceHostAllowed(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (host === "wikipedia.org" || host.endsWith(".wikipedia.org") || host.endsWith(".wikimedia.org")) return false;
  return SOURCE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function auditOnThisDay(file: OnThisDayFile, today = mountainIsoDay()): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const record of file.days) {
    const label = `${monthDayLabel(record.month, record.day)}`;
    const key = `${record.month}-${record.day}`;
    if (record.day > daysInMonth(record.month)) {
      problems.push(`${label} is not a real calendar day.`);
    }
    if (seen.has(key)) problems.push(`${label} is listed twice.`);
    seen.add(key);
    if (record.prompts[0] === record.prompts[1]) problems.push(`${label} repeats a discussion prompt.`);
    for (const prompt of record.prompts) {
      if (!prompt.endsWith("?")) problems.push(`${label} has a prompt that is not a question.`);
      if (BLOCKED.test(prompt)) problems.push(`${label} has a prompt that is not for a classroom.`);
    }
    for (const entry of record.entries) {
      const where = `${label} ${entry.year}`;
      if (calendarIso(entry.year, record.month, record.day) >= today) {
        problems.push(`${where} is not a past date.`);
      }
      const sentences = sentenceCount(entry.text);
      if (sentences < 1 || sentences > 2) problems.push(`${where} should be one or two sentences.`);
      if (sentenceCount(entry.kidLine) !== 1) problems.push(`${where} needs a one-sentence read-aloud line.`);
      if (BLOCKED.test(entry.text) || BLOCKED.test(entry.kidLine)) {
        problems.push(`${where} reads as harm, not good news.`);
      }
      const urls = new Set<string>();
      for (const source of entry.sources) {
        if (!source.url.startsWith("https://")) problems.push(`${where} citation must use https.`);
        if (urls.has(source.url)) problems.push(`${where} repeats a citation.`);
        urls.add(source.url);
        let pathname = "";
        try {
          pathname = new URL(source.url).pathname;
        } catch {
          pathname = "";
        }
        if (!pathname || pathname === "/") problems.push(`${where} citation should be a specific page.`);
        if (!sourceHostAllowed(source.url)) problems.push(`${where} citation host is not on the reputable-source list.`);
      }
    }
  }

  for (const day of seedWindow()) {
    if (!seen.has(`${day.month}-${day.day}`)) {
      problems.push(`${monthDayLabel(day.month, day.day)} is inside the seed window and has no entries.`);
    }
  }

  return problems;
}
