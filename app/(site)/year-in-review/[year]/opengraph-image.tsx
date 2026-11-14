import { ImageResponse } from "next/og";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";
import { isYearInReviewEdition } from "@/lib/year-in-review";

export const alt = "Good News Year in Review 2026";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const editionYear = Number(year);
  const kicker = isYearInReviewEdition(editionYear) ? `Good news ${editionYear}` : "Good news";
  return new ImageResponse(
    <OgFrame kicker={kicker} title="Year in Review" footer="Verified stories from the year" />,
    { ...size, fonts: ogFonts() },
  );
}
