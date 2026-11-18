import { ImageResponse } from "next/og";
import { BREAK_EDITIONS } from "@/data/break-editions";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Holiday break activities for kids";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return BREAK_EDITIONS.map((edition) => ({ slug: edition.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = BREAK_EDITIONS.find((item) => item.slug === slug);
  return new ImageResponse(
    <OgFrame
      kicker={edition?.kicker ?? "For families"}
      title={edition?.heading ?? "Good News Holiday Break Pack"}
      footer="Print at home · screen-light"
    />,
    { ...size, fonts: ogFonts() },
  );
}
