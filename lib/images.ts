/** Full photo plus a 360px sibling used for small thumbnails. */
export function storyImageSrcSet(src: string) {
  const small = src.replace(/\.webp$/, "-sm.webp");
  return { full: src, small };
}
