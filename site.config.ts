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
    "Real, uplifting news from all 50 states. Every story is checked and linked to its original source. No politics, no pop-ups, no clickbait.",
  domain,
  url: `https://${domain}`,
  contactEmail: `hello@${domain}`,
  locale: "en-US",
  social: {
    instagram: "tazzora",
    tiktok: "tazzora",
    youtube: "tazzora",
    facebook: "tazzora",
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
  ];
}
