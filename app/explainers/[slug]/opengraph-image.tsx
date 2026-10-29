import { ImageResponse } from "next/og";
import { getExplainer, getPublishedExplainers } from "@/lib/explainers";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { siteConfig } from "@/site.config";

export const alt = "Good News Explainer";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getPublishedExplainers().map((explainer) => ({ slug: explainer.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const explainer = getExplainer(slug);
  return new ImageResponse(
    <OgFrame
      kicker="Good News Explainer"
      title={explainer?.title ?? "How it works, and how to help"}
      footer={siteConfig.editor.name}
    />,
    { ...size, fonts: ogFonts() },
  );
}
