import { ImageResponse } from "next/og";
import { EXPLAINER_INDEX_TITLE } from "@/lib/explainers";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { siteConfig } from "@/site.config";

export const alt = EXPLAINER_INDEX_TITLE;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame kicker="Good News Explainers" title="How it works, and how to help" footer={siteConfig.domain} />,
    { ...size, fonts: ogFonts() },
  );
}
