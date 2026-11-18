import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Kindness Bingo for kids: a printable card of free kind acts";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="For families" title="Kindness Bingo" footer="Printable · free center square" />,
    { ...size, fonts: ogFonts() },
  );
}
