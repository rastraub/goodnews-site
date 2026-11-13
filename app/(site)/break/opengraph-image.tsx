import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Good News Holiday Break Pack for families";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="For families" title="Good News Holiday Break Pack" footer="Print at home · screen-light" />,
    { ...size, fonts: ogFonts() },
  );
}
