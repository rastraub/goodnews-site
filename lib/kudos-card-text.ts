/** Copy for a kudos card. No filesystem, no network. Safe to import from the browser. */

export const KUDOS_MESSAGES = [
  "Thank you. What you did is the kind of news people hope to read.",
  "A reader of this story wanted you to know someone noticed, and it mattered.",
  "Thank you for showing up for someone else. It made the news for a good reason.",
] as const;

export const KUDOS_SHARE = "Send a printable thank-you card for a helper in a verified good-news story.";

export function kudosCardText(input: {
  headline: string;
  honoree: string;
  message: string;
  storyUrl: string;
  siteName: string;
}): string {
  return [
    "Good news kudos",
    "",
    `For ${input.honoree}`,
    input.headline.trim(),
    "",
    input.message.trim(),
    "",
    "From:",
    "",
    input.storyUrl,
    `Shared via ${input.siteName}`,
  ].join("\n");
}

/** Opens the reader's mail app with an empty To line. */
export function kudosMailto(text: string, headline: string): string {
  const subject = `Thank you: ${headline}`.replace(/\s+/g, " ").trim().slice(0, 120);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

/** Opens the reader's texting app. No recipient is filled in. */
export function kudosSms(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}
