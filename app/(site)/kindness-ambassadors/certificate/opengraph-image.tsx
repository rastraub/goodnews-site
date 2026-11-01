import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Kindness Ambassador certificate";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="For classrooms" title="A certificate for your class" footer="Print it. Nothing is stored." />,
    { ...size, fonts: ogFonts() },
  );
}
