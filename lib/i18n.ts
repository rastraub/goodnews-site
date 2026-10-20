/**
 * English is the only edition, and it lives at the site root.
 * A future translation adds a row here with a path prefix such as `/es`.
 * Page metadata reads this list for hreflang. Do not hardcode language alternates in pages.
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
