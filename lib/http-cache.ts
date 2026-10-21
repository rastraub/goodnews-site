/**
 * Cache policy for a site that publishes on deploy.
 * HTML stays deployment-scoped so the morning edition is not stuck in a browser.
 * Photos, feeds, and sitemaps can sit longer because a new deploy replaces the CDN copy.
 */

/**
 * Story photos stay cached for 30 days at whatever URL was published.
 * A replacement has to use a new filename (`slug-v2.webp`). Overwriting the file leaves readers on the old photo.
 */
export const IMAGE_CACHE_CONTROL = "public, max-age=2592000, stale-while-revalidate=31536000";

/** Feeds update when the morning job deploys. Browsers may hold a copy for an hour. */
export const FEED_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** News sitemap should be picked up the same morning, so browsers recheck sooner than the full feed. */
export const NEWS_SITEMAP_CACHE_CONTROL = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";
