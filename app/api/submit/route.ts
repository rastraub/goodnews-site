import { handleStorySubmission } from "@/lib/submissions";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getStateByCode } from "@/lib/states";
import { TIP_LIMITS, cleanHttpUrl, isSafeMailbox, multiLine, singleLine } from "@/lib/tip-mail";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "submit"), 5)) {
    return Response.json({ ok: false, error: "Too many tips. Wait a minute and try again." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "That tip was empty." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  // Honeypot. Real people never see this field. Pretend it worked.
  if (typeof data.company === "string" && data.company.trim()) {
    return Response.json({ ok: true });
  }

  const name = singleLine(data.name, TIP_LIMITS.name);
  const email = singleLine(data.email, TIP_LIMITS.email);
  const city = singleLine(data.city, TIP_LIMITS.city);
  const state = singleLine(data.state, 8);
  const summary = multiLine(data.summary, TIP_LIMITS.summary);
  const source = singleLine(data.sourceUrl, TIP_LIMITS.sourceUrl);
  const page = singleLine(data.pageUrl, TIP_LIMITS.pageUrl);
  const referer = singleLine(request.headers.get("referer"), TIP_LIMITS.pageUrl);

  if (name.tooLong) {
    return Response.json({ ok: false, error: "That name is too long." }, { status: 400 });
  }
  if (name.value.length < 2) {
    return Response.json({ ok: false, error: "Add your name." }, { status: 400 });
  }
  if (email.tooLong || !isSafeMailbox(email.value)) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (city.tooLong) {
    return Response.json({ ok: false, error: "That city name is too long." }, { status: 400 });
  }
  const stateCode = state.value.toUpperCase();
  if (!city.value || state.tooLong || !getStateByCode(stateCode)) {
    return Response.json({ ok: false, error: "Add a city and a state." }, { status: 400 });
  }
  if (summary.tooLong) {
    return Response.json({ ok: false, error: "That story is too long to send." }, { status: 400 });
  }
  if (summary.value.length < TIP_LIMITS.summaryMin) {
    return Response.json({ ok: false, error: "Tell us a little more about what happened (at least a few sentences)." }, { status: 400 });
  }
  if (source.tooLong) {
    return Response.json({ ok: false, error: "That source link is too long." }, { status: 400 });
  }
  const sourceUrl = source.value ? cleanHttpUrl(source.value, TIP_LIMITS.sourceUrl) : "";
  if (source.value && !sourceUrl.startsWith("https://")) {
    return Response.json({ ok: false, error: "Source links need to start with https://." }, { status: 400 });
  }
  const pageUrl =
    (!page.tooLong && cleanHttpUrl(page.value, TIP_LIMITS.pageUrl)) ||
    (!referer.tooLong && cleanHttpUrl(referer.value, TIP_LIMITS.pageUrl)) ||
    "";

  try {
    await handleStorySubmission({
      name: name.value,
      email: email.value,
      city: city.value,
      state: stateCode,
      summary: summary.value,
      sourceUrl: sourceUrl || undefined,
      pageUrl: pageUrl || undefined,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[submit] handler failed", error);
    return Response.json({ ok: false, error: "We couldn't save that tip. Please try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
