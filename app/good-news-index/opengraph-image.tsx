import { ImageResponse } from "next/og";
import { latestIndex } from "@/lib/good-news-index";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Good News Index";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  const edition = latestIndex();
  const title = edition ? (edition.inProgress ? `${edition.label}, month to date` : edition.label) : "Monthly editions";
  const footer = edition ? `${edition.storyCount} stories we published` : "Stories we published. Not a ranking of states.";
  return new ImageResponse(<OgFrame kicker="Good News Index" title={title} footer={footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
