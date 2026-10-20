/** Listing pages stay small when the archive grows. */
export const STORY_PAGE_SIZE = 24;

/**
 * Every published story is prebuilt through this cap.
 * Past it, validate-stories fails the build. Raising the cap costs build
 * minutes. Leaving the extra stories to render on request costs a function
 * invocation for each crawler after every deploy, so the cap fails closed.
 * 15_000 covers a 10k archive with room for the next batches.
 */
export const STATIC_STORY_CAP = 15_000;

/**
 * Listing page 2 and later, prebuilt per section. 700 pages is 16,800 stories
 * in one section, above the story cap, so a normal archive never falls through
 * to a function.
 */
export const MAX_PRERENDERED_PAGES = 700;

export function pageCount(total: number, size = STORY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function pageSlice<T>(items: T[], page: number, size = STORY_PAGE_SIZE): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

/** Page 1 is the base path. Later pages are `/page/2`. */
export function pagePath(base: string, page: number): string {
  if (page <= 1) return base;
  return `${base}/page/${page}`;
}

export function listingPageParams(entries: { slug: string; total: number }[]): { slug: string; page: string }[] {
  const params: { slug: string; page: string }[] = [];
  for (const entry of entries) {
    const last = Math.min(MAX_PRERENDERED_PAGES, pageCount(entry.total));
    for (let page = 2; page <= last; page += 1) {
      params.push({ slug: entry.slug, page: String(page) });
    }
  }
  return params;
}

export function parsePageParam(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

export function archivePageParams(total: number): { page: string }[] {
  const last = Math.min(MAX_PRERENDERED_PAGES, pageCount(total));
  const params: { page: string }[] = [];
  for (let page = 2; page <= last; page += 1) params.push({ page: String(page) });
  return params;
}
