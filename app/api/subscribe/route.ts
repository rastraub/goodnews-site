import { subscribeEmail, type EmailInterest } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "subscribe"))) {
    return Response.json({ ok: false, error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  const data = body as { email?: unknown; interest?: unknown; company?: unknown };
  if (typeof data.company === "string" && data.company.trim()) {
    return Response.json({ ok: true, mode: "logged" });
  }
  const interest: EmailInterest = data.interest === "membership" ? "membership" : "daily";
  const result = await subscribeEmail(typeof data.email === "string" ? data.email : "", interest);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
