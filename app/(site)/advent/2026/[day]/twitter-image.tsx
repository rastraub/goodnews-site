export { default, alt, size, contentType } from "./opengraph-image";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Array.from({ length: 24 }, (_, index) => ({ day: String(index + 1) }));
}
