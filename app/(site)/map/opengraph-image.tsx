import { ImageResponse } from "next/og";
import { goodNewsMap } from "@/lib/good-news-map";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Good News Map";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  const board = goodNewsMap();
  const footer = board.storyCount ? `${board.storyCount} stories from the last 30 days` : "Recent stories across the United States";
  return new ImageResponse(<OgFrame kicker="Explore by place" title="Good News Map" footer={footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
