import { shoutoutMonthsToPrerender } from "@/lib/kindness-ambassadors";

export { default, alt, size, contentType } from "./opengraph-image";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return shoutoutMonthsToPrerender().map((month) => ({ month }));
}
