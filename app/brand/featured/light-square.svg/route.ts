import { badgeSvg, badgeVariant } from "@/lib/badges";

export const dynamic = "force-static";

export function GET() {
  const variant = badgeVariant("light-square");
  if (!variant) return new Response("Not found", { status: 404 });
  return new Response(badgeSvg(variant), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
