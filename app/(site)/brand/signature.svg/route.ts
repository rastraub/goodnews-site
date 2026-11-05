import { signatureSvg } from "@/lib/signature-badge";

export const dynamic = "force-static";

export function GET() {
  return new Response(signatureSvg(), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
