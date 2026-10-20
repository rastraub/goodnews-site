/** Full photo plus a 360px sibling used for small thumbnails. */
export function storyImageSrcSet(src: string) {
  const small = src.replace(/\.webp$/, "-sm.webp");
  return { full: src, small };
}

/**
 * Large JPEG next to the WebP, for feeds, og:image, and NewsArticle.
 * The page `<img>` keeps the WebP. A missing file falls back and does not fail the build.
 */
export function largeJpegPath(webpPath: string): string {
  return webpPath.replace(/\.webp$/, "-1600.jpg");
}
