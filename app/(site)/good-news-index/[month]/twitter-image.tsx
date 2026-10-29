import { indexesToPrerender } from "@/lib/good-news-index";

export { default, alt, size, contentType } from "./opengraph-image";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return indexesToPrerender().map((edition) => ({ month: edition.month }));
}
