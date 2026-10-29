import { badgePng } from "@/lib/badge-png";

export const dynamic = "force-static";

export function GET() {
  return badgePng("light-square");
}
