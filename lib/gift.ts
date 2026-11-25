/**
 * Readers gift the free daily Top 5 by opening their own email or text app.
 * Nothing is sent from this site, and a friend's address is never collected.
 * The signup URL is the existing subscribe page. Public pages do not add
 * tracking parameters, so this link does not add one either.
 */
import { GIFT_PATH } from "./gift-path";
import { absoluteUrl } from "./seo";
import { mountainDay, parseIsoDate } from "./weeks";
import { siteConfig } from "@/site.config";

export { GIFT_PATH };
export const GIFT_TITLE = "Gift the Good News";
export const GIFT_DESCRIPTION = `Give someone the free daily Top 5 from ${siteConfig.name}. Open your own email or text app, or print a card. We never see their address.`;

export type GiftMessage = {
  id: string;
  label: string;
  note: string;
  subject: string;
  body: string;
};

export function giftSignupUrl(): string {
  return absoluteUrl("/subscribe");
}

/** November 20 through December 31. The page copy uses this. The homepage does not. */
export function giftSeason(day = mountainDay()): boolean {
  const parts = parseIsoDate(day);
  if (!parts) return false;
  const monthDay = day.slice(5);
  return monthDay >= "11-20" && monthDay <= "12-31";
}

export function giftMessages(signupUrl = giftSignupUrl()): GiftMessage[] {
  const signoff = `Sign up here: ${signupUrl}`;
  return [
    {
      id: "grandparent",
      label: "For a grandparent",
      note: "A gentle morning read.",
      subject: "A small gift of good news",
      body: `I thought of you. There is a free morning email of five true, uplifting stories. It takes about two minutes, and it is a gentle way to start the day.\n\n${signoff}`,
    },
    {
      id: "coworker",
      label: "For a coworker",
      note: "Short, and free of politics.",
      subject: "Something kind for your inbox",
      body: `Work weeks get loud. I wanted to pass along a free email of five verified good-news stories each morning. No politics, and it takes about two minutes.\n\n${signoff}`,
    },
    {
      id: "hard-year",
      label: "For someone who's had a hard year",
      note: "Warm, and not advice.",
      subject: "A little good news, from me",
      body: `This year has asked a lot. I am not sending advice, only a free morning email of five true, hopeful stories. If you want it, the signup is here.\n\n${signoff}`,
    },
    {
      id: "someone-you-love",
      label: "For someone you love",
      note: "A plain version you can edit.",
      subject: "I wanted you to have this",
      body: `I am gifting you a free daily email of five true good-news stories. It is short, it is verified, and you can leave whenever you want.\n\n${signoff}`,
    },
  ];
}

export function giftClipboard(message: Pick<GiftMessage, "subject" | "body">): string {
  return `Subject: ${message.subject}\n\n${message.body}`;
}

export function giftMailto(message: Pick<GiftMessage, "subject" | "body">): string {
  return `mailto:?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
}

export function giftSms(message: Pick<GiftMessage, "body">): string {
  return `sms:?&body=${encodeURIComponent(message.body)}`;
}
