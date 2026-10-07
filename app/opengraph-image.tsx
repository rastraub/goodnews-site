import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { siteConfig } from "@/site.config";

export const alt = siteConfig.seoTitle;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker={siteConfig.tagline} title={siteConfig.seoTitle} footer={siteConfig.domain} />,
    { ...size, fonts: ogFonts() },
  );
}
