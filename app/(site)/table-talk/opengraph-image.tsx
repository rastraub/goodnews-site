import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { tableTalkYear } from "@/lib/table-talk";

export const alt = "Good News Table Talk: printable conversation cards from real stories";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  const year = tableTalkYear();
  return new ImageResponse(
    <OgFrame kicker={`Thanksgiving ${year}`} title="Good News Table Talk" footer="Printable cards from real stories" />,
    { ...size, fonts: ogFonts() },
  );
}
