import { storyImageSrcSet } from "@/lib/images";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Use the small file only. Top 5 thumbs are about 92px. */
  thumb?: boolean;
  treatment?: "none" | "warm";
};

export function StoryImage({ src, alt, sizes, priority = false, thumb = false, treatment }: Props) {
  const { full, small } = storyImageSrcSet(src);
  const filter = treatment === "warm" ? "sepia(0.18) saturate(1.15)" : undefined;
  return (
    // Pre-sized WebP files with a srcSet. The image optimizer was slower than serving them directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="cover"
      src={thumb ? small : full}
      srcSet={thumb ? undefined : `${small} 360w, ${full} 840w`}
      sizes={thumb ? undefined : sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={filter ? { filter } : undefined}
    />
  );
}
