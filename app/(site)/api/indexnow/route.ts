import { timingSafeEqual } from "node:crypto";
import { recentIndexNowUrls, submitIndexNow } from "@/lib/indexnow-submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily IndexNow ping. Vercel Cron calls GET /api/indexnow on the production
 * deployment only (vercel.json, 16:00 UTC, after the morning story commits).
 * Preview deployments never ping. The lookback is 96 hours because story
 * dates usually lag the commit.
 * CRON_SECRET must be set; otherwise every request is refused.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header || header.length > 2000) return false;
  const expected = `Bearer ${secret}`;
  const received = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length) return false;
  return timingSafeEqual(received, wanted);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    console.warn("IndexNow cron refused: CRON_SECRET is unset or the Authorization header does not match.");
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  if (!dryRun && process.env.VERCEL_ENV !== "production") {
    console.log("IndexNow skipped outside production.");
    return Response.json(
      { ok: true, skipped: true, reason: "production-only" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const recent = recentIndexNowUrls();
    const result = await submitIndexNow(recent.urls, { dryRun });
    if (dryRun) {
      return Response.json(
        {
          ok: true,
          dryRun: true,
          count: result.count,
          stories: recent.stories,
          payloads: result.payloads,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    console.log(
      result.skipped
        ? "IndexNow: no stories in the lookback window."
        : `IndexNow cron finished. ok=${result.ok} status=${result.status ?? "none"} urls=${result.count}`,
    );
    return Response.json(
      { ok: result.ok, skipped: result.skipped, count: result.count, status: result.status ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("IndexNow cron failed.");
    console.warn(error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** Schedules call POST. Cron jobs call GET. Both paths share the handler above. */
export async function POST(request: Request) {
  return GET(request);
}
