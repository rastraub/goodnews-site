/**
 * English stays at the site root. Page metadata reads `hreflangAlternates` for
 * that edition. Do not hardcode language alternates in pages.
 *
 * Spanish is a weekly Top 5, not a translated copy of every URL. Its paths are
 * `/es`, `/es/buenas-noticias`, and `/es/buenas-noticias/{monday}`. Pair an
 * edition with the English week through the helpers below. Do not add `{ prefix: "/es" }`
 * to `locales`: that would advertise `/es/story/...` and `/es/week/...`, which are not pages.
 */
export const locales = [
  { code: "en", hreflang: "en", prefix: "", label: "English" },
] as const;

export type LocaleCode = (typeof locales)[number]["code"];

export function localizedPath(path: string, prefix = ""): string {
  const normalized = path === "" || path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (!prefix) return normalized;
  return normalized === "/" ? prefix : `${prefix}${normalized}`;
}

/** hreflang map for the current editions, plus x-default. */
export function hreflangAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale.hreflang] = localizedPath(path, locale.prefix);
  }
  languages["x-default"] = localizedPath(path, locales[0].prefix);
  return languages;
}

/** English week index and the Spanish edition index are the same roundup in two languages. */
export function weekIndexLanguageAlternates(): Record<string, string> {
  return {
    en: "/week",
    es: "/es/buenas-noticias",
    "x-default": "/week",
  };
}

/** One finished or open week, paired with its Spanish Top 5. */
export function editionLanguageAlternates(start: string): Record<string, string> {
  return {
    en: `/week/${start}`,
    es: `/es/buenas-noticias/${start}`,
    "x-default": `/week/${start}`,
  };
}
