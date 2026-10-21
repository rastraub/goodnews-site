import { ImageResponse } from "next/og";
import { indexesToPrerender } from "@/lib/good-news-index";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Good News Index";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return indexesToPrerender().map((edition) => ({ month: edition.month }));
}

export default async function Image({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const edition = indexesToPrerender().find((item) => item.month === month);
  const title = edition ? (edition.inProgress ? `${edition.label}, month to date` : edition.label) : "Good News Index";
  const footer = edition ? `${edition.storyCount} stories we published` : "Stories we published. Not a ranking of states.";
  return new ImageResponse(<OgFrame kicker="Good News Index" title={title} footer={footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
