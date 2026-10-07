import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { getStory } from "@/lib/stories";
import { placeLabel } from "@/lib/present";
import { getCategory } from "@/lib/categories";

export const size = ogSize;
export const contentType = "image/png";

export const alt = "Story share image";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  const title = story?.title ?? "Good news";
  const category = story ? getCategory(story.category)?.label : "";
  const kicker = story ? `${category} · ${placeLabel(story)}` : "";
  const footer = story ? `Verified · ${story.sourceName}` : undefined;
  return new ImageResponse(<OgFrame kicker={kicker} title={title} footer={footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
