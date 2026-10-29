import { embedDocumentForSlug } from "@/lib/partner-kit";
import { STATES } from "@/lib/states";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [{ slug: "latest" }, ...STATES.map((state) => ({ slug: state.slug }))];
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const html = embedDocumentForSlug(slug);
  if (!html) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
