import { indexesToPrerender, renderIndexCsv } from "@/lib/good-news-index";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return indexesToPrerender().map((edition) => ({ month: edition.month }));
}

export async function GET(_request: Request, context: { params: Promise<{ month: string }> }) {
  const { month } = await context.params;
  const edition = indexesToPrerender().find((item) => item.month === month);
  if (!edition) return new Response("Not found", { status: 404 });
  return new Response(renderIndexCsv(edition), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="good-news-index-${edition.month}.csv"`,
    },
  });
}
