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
      "Verified good news from the United States and countries around the world. Every story is checked against the original report, linked to that source, and kept free of politics. Editors review published stories and correct errors in public.",
  },
  /**
   * Legal owner of the publication. Not a person.
   * City and state live in OWNER_LOCATION and stay off the page until set.
   */
  owner: {
    name: "SBBnet, Inc.",
  },
  /**
   * How a published story is checked. The daily run publishes stories.
   * Do not claim a human signs off before publication.
   */
  verification:
    "Every story is checked against its original report: names, places, numbers, and quotes must match the source, which we link on every story. Our editors review published stories and correct errors in public.",
  /**
   * Accounts this publication controls. A blank handle is omitted from the
   * footer and from NewsMediaOrganization.sameAs. Fill one in only after
   * that account exists.
   */
  social: {
    x: "TazzoraNews",
    instagram: "",
    tiktok: "",
    youtube: "",
    facebook: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Soft homepage prompt for heavy news cycles.
 * `start` and `end` are inclusive calendar dates in `timeZone`.
 * The banner stays off outside this window. Change the dates here.
 */
export const newsBreakBanner = {
  path: "/news-break",
  start: "2026-10-31",
  end: "2026-11-06",
  timeZone: "America/New_York",
  label: "News feeling heavy? Take a good-news break.",
} as const;

/**
 * TODO: Set the city and state where SBBnet, Inc. operates.
 * Do not invent a location. Leave both empty until they are known.
 * About copy and NewsMediaOrganization JSON-LD omit the place until both are non-empty.
 */
export const OWNER_LOCATION: { city: string; state: string } = {
  city: "",
  state: "",
};

/** City and state for the owner, or undefined while OWNER_LOCATION is unset. */
export function ownerPlace(): { city: string; state: string } | undefined {
  const city = OWNER_LOCATION.city.trim();
  const state = OWNER_LOCATION.state.trim();
  if (!city || !state) return undefined;
  return { city, state };
}

const SOCIAL_PROFILES = [
  { key: "x", label: "X", short: "X", href: (handle: string) => `https://x.com/${handle}` },
  { key: "instagram", label: "Instagram", short: "IG", href: (handle: string) => `https://www.instagram.com/${handle}` },
  { key: "tiktok", label: "TikTok", short: "TT", href: (handle: string) => `https://www.tiktok.com/@${handle}` },
  { key: "youtube", label: "YouTube", short: "YT", href: (handle: string) => `https://www.youtube.com/@${handle}` },
  { key: "facebook", label: "Facebook", short: "FB", href: (handle: string) => `https://www.facebook.com/${handle}` },
] as const;

export function socialLinks() {
  return SOCIAL_PROFILES.flatMap((profile) => {
    const handle = siteConfig.social[profile.key].trim();
    if (!handle) return [];
    return [{ label: profile.label, short: profile.short, href: profile.href(handle) }];
  });
}
