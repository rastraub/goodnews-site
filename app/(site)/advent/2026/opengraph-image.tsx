import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "December Advent of Good News";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="December 1–24" title="Advent of Good News" footer="One real story and one free kind act a day" />,
    { ...size, fonts: ogFonts() },
  );
}
