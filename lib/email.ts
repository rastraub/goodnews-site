import { getStateByCode } from "./states";

export type EmailInterest = "daily" | "membership" | "teachers";

/** Accept only known list tags. Anything else stays on the daily list. */
export function parseEmailInterest(value: unknown): EmailInterest {
  if (value === "membership" || value === "teachers" || value === "daily") return value;
  return "daily";
}

/** Select value for a reader outside the United States. Not a USPS code. */
export const OUTSIDE_US = "OUT";

/**
 * A USPS code, DC, or OUT. Anything else is dropped so the signup
 * continues with no state, the same as a form that left the field blank.
 */
export function parseStatePreference(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return undefined;
  if (trimmed === OUTSIDE_US || trimmed === "OUTSIDE") return OUTSIDE_US;
  if (getStateByCode(trimmed)) return trimmed;
  return undefined;
}

/** Metadata value stored for a state preference, such as state-co. */
export function stateTag(state: string | undefined): string | undefined {
  if (!state) return undefined;
  if (state === OUTSIDE_US) return "state-outside-us";
  if (getStateByCode(state)) return `state-${state.toLowerCase()}`;
  return undefined;
}

/**
 * Same subscriber body the site already posts. The interest tag is unchanged.
 * A chosen state is metadata on that request, not a new tag and not a new endpoint.
 * Metadata is omitted when no state was chosen.
 */
export function buttondownPayload(email: string, interest: EmailInterest, state?: string): {
  email_address: string;
  tags: string[];
  metadata?: { state: string };
} {
  const body: { email_address: string; tags: string[]; metadata?: { state: string } } = {
    email_address: email,
    tags: [interest],
  };
  const metadata = stateTag(parseStatePreference(state));
  if (metadata) body.metadata = { state: metadata };
  return body;
}

export function beehiivPayload(email: string, interest: EmailInterest, state?: string): {
  email: string;
  reactivate_existing: boolean;
  send_welcome_email: boolean;
  utm_source: string;
  custom_fields: { name: string; value: string }[];
} {
  const custom_fields: { name: string; value: string }[] = [{ name: "interest", value: interest }];
  const metadata = stateTag(parseStatePreference(state));
  if (metadata) custom_fields.push({ name: "state", value: metadata });
  return {
    email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: "website",
    custom_fields,
  };
}

export type SubscribeResult =
  | { ok: true; mode: "provider" | "logged" }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Provider-agnostic newsletter signup.
 *
 * EMAIL_PROVIDER and EMAIL_API_KEY, when both are set, take precedence.
 * Otherwise BUTTONDOWN_API_KEY sends the address to Buttondown.
 * Both Buttondown paths send one tag: daily, membership, or teachers.
 * An optional state is metadata on that same subscriber request.
 * It is left off when the reader does not pick a state.
 * Resend's contact call has no metadata field, so a state is not sent there.
 * With no key at all, this logs the address and reports success so the form
 * works in local dev. See README.
 */
export async function subscribeEmail(
  emailRaw: string,
  interest: EmailInterest = "daily",
  stateRaw?: unknown,
): Promise<SubscribeResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const state = parseStatePreference(stateRaw);

  const provider = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const key = (process.env.EMAIL_API_KEY || "").trim();
  const buttondownKey = (process.env.BUTTONDOWN_API_KEY || "").trim();

  if (provider && key) {
    try {
      if (provider === "buttondown") return await subscribeButtondown(email, key, interest, state);
      if (provider === "beehiiv") return await subscribeBeehiiv(email, key, interest, state);
      if (provider === "resend") return await subscribeResend(email, key);
      return { ok: false, error: `Unknown email provider "${provider}". Use buttondown, beehiiv, or resend.` };
    } catch (error) {
      console.error("[email] provider request failed", error);
      return { ok: false, error: "We couldn't add you just now. Please try again in a minute." };
    }
  }

  if (buttondownKey) {
    try {
      return await subscribeButtondown(email, buttondownKey, interest, state);
    } catch (error) {
      console.error("[email] buttondown request failed", error);
      return { ok: false, error: "We couldn't add you just now. Please try again in a minute." };
    }
  }

  if (provider || key) {
    console.warn("[email] Set both EMAIL_PROVIDER and EMAIL_API_KEY to deliver mail. Logging only.");
  }
  const preference = stateTag(state);
  console.log(
    `[email] signup logged (no provider key) interest=${interest} address=${email}${preference ? ` state=${preference}` : ""}`,
  );
  return { ok: true, mode: "logged" };
}

async function postJson(url: string, keyHeader: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        Authorization: keyHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function subscribeButtondown(
  email: string,
  key: string,
  interest: EmailInterest,
  state?: string,
): Promise<SubscribeResult> {
  const response = await postJson(
    "https://api.buttondown.com/v1/subscribers",
    `Token ${key}`,
    buttondownPayload(email, interest, state),
  );
  if (response.ok) return { ok: true, mode: "provider" };
  const text = await response.text();
  if (isAlreadySubscribed(response.status, text)) return { ok: true, mode: "provider" };
  console.error("[email] buttondown", response.status, text.slice(0, 300));
  return { ok: false, error: "The email list didn't accept that address. Please try again." };
}

function isAlreadySubscribed(status: number, text: string): boolean {
  if (status !== 400 && status !== 409) return false;
  if (/already/i.test(text)) return true;
  try {
    const data = JSON.parse(text) as { code?: unknown; detail?: unknown };
    const code = typeof data.code === "string" ? data.code : "";
    if (code === "email_already_exists" || /already/i.test(code)) return true;
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (/already/i.test(detail)) return true;
  } catch {
    return false;
  }
  return false;
}

async function subscribeBeehiiv(
  email: string,
  key: string,
  interest: EmailInterest,
  state?: string,
): Promise<SubscribeResult> {
  const publicationId = (process.env.EMAIL_PUBLICATION_ID || "").trim();
  if (!publicationId) {
    return { ok: false, error: "Beehiiv needs EMAIL_PUBLICATION_ID." };
  }
  const response = await postJson(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    `Bearer ${key}`,
    beehiivPayload(email, interest, state),
  );
  if (response.ok || response.status === 409) return { ok: true, mode: "provider" };
  const text = await response.text();
  console.error("[email] beehiiv", response.status, text.slice(0, 300));
  return { ok: false, error: "The email list didn't accept that address." };
}

async function subscribeResend(email: string, key: string): Promise<SubscribeResult> {
  const audienceId = (process.env.EMAIL_AUDIENCE_ID || "").trim();
  if (!audienceId) {
    return { ok: false, error: "Resend needs EMAIL_AUDIENCE_ID." };
  }
  const response = await postJson(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    `Bearer ${key}`,
    { email, unsubscribed: false },
  );
  if (response.ok || response.status === 409) return { ok: true, mode: "provider" };
  const text = await response.text();
  console.error("[email] resend", response.status, text.slice(0, 300));
  return { ok: false, error: "The email list didn't accept that address." };
}
