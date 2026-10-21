/**
 * Thumbnail sibling of a story WebP.
 * Only the extension changes, so a versioned stem stays put:
 * `/images/stories/pony-v2.webp` -> `/images/stories/pony-v2-sm.webp`.
 * Photos under `/images` are cached for 30 days, so a replacement is a new stem, not an overwrite.
 */
export function storyThumbPath(src: string) {
  return src.replace(/\.webp$/, "-sm.webp");
}

/** Full photo plus a 360px sibling used for small thumbnails. */
export function storyImageSrcSet(src: string) {
  return { full: src, small: storyThumbPath(src) };
}

/**
 * Large JPEG next to the WebP, for feeds, og:image, and NewsArticle.
 * The page `<img>` keeps the WebP. A missing file falls back and does not fail the build.
 * `/images/stories/pony-v2.webp` -> `/images/stories/pony-v2-1600.jpg`.
 */
export function largeJpegPath(webpPath: string): string {
  return webpPath.replace(/\.webp$/, "-1600.jpg");
}
