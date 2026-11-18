import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { siteConfig } from "@/site.config";

export const alt = `Gift the free daily Top 5 from ${siteConfig.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="A free gift" title="Gift the Good News" footer="Five true stories, every morning" />,
    { ...size, fonts: ogFonts() },
  );
}
