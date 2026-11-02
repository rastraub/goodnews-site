import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Kindness Ambassadors";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="For classrooms" title="Kindness Ambassadors" footer="One small, free act of kindness a week" />,
    { ...size, fonts: ogFonts() },
  );
}
