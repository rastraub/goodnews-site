import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Good News Year in Review";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="Good news" title="Year in Review" footer="Verified stories from the archive" />,
    { ...size, fonts: ogFonts() },
  );
}
