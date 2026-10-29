import { brandImage } from "@/lib/brand";

export const dynamic = "force-static";

export function GET() {
  return brandImage("favicon-48");
}
