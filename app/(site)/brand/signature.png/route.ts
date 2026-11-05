import { signaturePng } from "@/lib/signature-badge-png";

export const dynamic = "force-static";

export function GET() {
  return signaturePng();
}
