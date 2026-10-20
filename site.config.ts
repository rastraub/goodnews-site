/**
 * The only place the site name lives.
 * Rename the product by editing this file. Do not hardcode these strings
 * in pages, metadata, images, email copy, or the footer.
 */
const domain = "tazzora.com";

export const siteConfig = {
  name: "Tazzora",
  logoText: "Tazzora",
  tagline: "Upbeat, verified good news from across America",
  seoTitle: "Upbeat, verified good news from across America",
  description:
    "Real, uplifting news from all 50 states and countries around the world. Every story is checked and linked to its original source. No politics, no pop-ups, no clickbait.",
  domain,
  // The apex host 308s to www. Absolute URLs use the host that returns 200.
  url: `https://www.${domain}`,
  // The only mailbox. Pages, feeds, and structured data read this. Do not add another address.
  contactEmail: `cheers@${domain}`,
  locale: "en-US",
  /**
   * Public byline. Organization-style masthead, not a named person.
   * `blurb` is the short mission line shown with the masthead.
   */
  editor: {
    name: "Tazzora Editorial Team",
    blurb:
      "Verified good news from the United States and countries around the world. Every story is checked against the original report, linked to that source, and kept free of politics.",
  },
  social: {
    instagram: "tazzora",
    tiktok: "tazzora",
    youtube: "tazzora",
    facebook: "tazzora",
    x: "TazzoraNews",
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function socialLinks() {
  const { social } = siteConfig;
  return [
    { label: "Instagram", short: "IG", href: `https://instagram.com/${social.instagram}` },
    { label: "TikTok", short: "TT", href: `https://www.tiktok.com/@${social.tiktok}` },
    { label: "YouTube", short: "YT", href: `https://www.youtube.com/@${social.youtube}` },
    { label: "Facebook", short: "FB", href: `https://www.facebook.com/${social.facebook}` },
    { label: "X", short: "X", href: `https://x.com/${social.x}` },
  ];
}
