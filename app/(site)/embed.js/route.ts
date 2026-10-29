import { embedScriptSource } from "@/lib/partner-kit";

export const dynamic = "force-static";

export function GET() {
  return new Response(embedScriptSource(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}
