import { ImageResponse } from "next/og";
import { classesForMonth, formatAmbassadorMonth, shoutoutMonthsToPrerender } from "@/lib/kindness-ambassadors";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "Kindness Ambassador shoutouts";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return shoutoutMonthsToPrerender().map((month) => ({ month }));
}

export default async function Image({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const label = formatAmbassadorMonth(month);
  const count = classesForMonth(month).length;
  const footer = count
    ? `${count === 1 ? "1 class" : `${count} classes`} · group, place, and the act`
    : "Be the first class featured";
  return new ImageResponse(<OgFrame kicker="Kindness Ambassadors" title={`Shoutouts for ${label}`} footer={footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
