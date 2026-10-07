import { handleStorySubmission } from "@/lib/submissions";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getStateByCode } from "@/lib/states";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "submit"), 5)) {
    return Response.json({ ok: false, error: "Too many tips. Wait a minute and try again." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "That tip was empty." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  if (typeof data.company === "string" && data.company.trim()) {
    return Response.json({ ok: true });
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const city = typeof data.city === "string" ? data.city.trim() : "";
  const state = typeof data.state === "string" ? data.state.trim().toUpperCase() : "";
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  const sourceUrl = typeof data.sourceUrl === "string" ? data.sourceUrl.trim() : "";

  if (name.length < 2 || name.length > 120) {
    return Response.json({ ok: false, error: "Add your name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (!city || !getStateByCode(state)) {
    return Response.json({ ok: false, error: "Add a city and a state." }, { status: 400 });
  }
  if (summary.length < 40 || summary.length > 5000) {
    return Response.json({ ok: false, error: "Tell us a little more about what happened (at least a few sentences)." }, { status: 400 });
  }
  if (sourceUrl && !/^https:\/\/\S+$/.test(sourceUrl)) {
    return Response.json({ ok: false, error: "Source links need to start with https://." }, { status: 400 });
  }

  try {
    await handleStorySubmission({
      name,
      email,
      city,
      state,
      summary,
      sourceUrl: sourceUrl || undefined,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[submit] handler failed", error);
    return Response.json({ ok: false, error: "We couldn't save that tip. Please try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
