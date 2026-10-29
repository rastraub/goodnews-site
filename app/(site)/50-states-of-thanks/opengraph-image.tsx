import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "50 States of Thanks: Thanksgiving good news from every state";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="Thanksgiving 2026" title="50 States of Thanks" footer="Good news from every state" />,
    { ...size, fonts: ogFonts() },
  );
}
