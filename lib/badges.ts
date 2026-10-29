import { escapeHtml } from "./tip-mail";
import { siteConfig } from "@/site.config";

/**
 * Downloadable "Featured on …" badges.
 * SVG is a small vector file with no remote requests. PNG is rendered beside it
 * for newsletters and tools that will not take an SVG. Both read the wordmark
 * from site config so a rename does not leave the old name on the badge.
 */
export const BADGE_VARIANTS = [
  { id: "light-horizontal", theme: "light", shape: "horizontal", label: "Light, horizontal", width: 320, height: 72 },
  { id: "dark-horizontal", theme: "dark", shape: "horizontal", label: "Dark, horizontal", width: 320, height: 72 },
  { id: "light-square", theme: "light", shape: "square", label: "Light, square", width: 200, height: 200 },
  { id: "dark-square", theme: "dark", shape: "square", label: "Dark, square", width: 200, height: 200 },
] as const;

export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type BadgeFormat = "svg" | "png";

export type BadgeTheme = {
  bg: string;
  stroke: string;
  kicker: string;
  name: string;
};

export function badgeVariant(id: string): BadgeVariant | undefined {
  return BADGE_VARIANTS.find((item) => item.id === id);
}

export function badgePath(variant: BadgeVariant, format: BadgeFormat): string {
  return `/brand/featured/${variant.id}.${format}`;
}

export function badgeTheme(theme: BadgeVariant["theme"]): BadgeTheme {
  if (theme === "dark") {
    return { bg: "#1C2733", stroke: "#314152", kicker: "#F3B23C", name: "#FFFBF4" };
  }
  return { bg: "#FFFBF4", stroke: "#E4D3B0", kicker: "#8F5E00", name: "#1C2733" };
}

export function badgeAlt(): string {
  return `Featured on ${siteConfig.name}`;
}

/** Display size in the embed. PNG files are 2× this so they stay sharp. */
export const BADGE_PNG_SCALE = 2;

function sun(size: number): string {
  const outer = size / 2;
  const inner = (size * 0.46) / 2;
  return `<svg x="0" y="0" width="${size}" height="${size}" aria-hidden="true"><circle cx="${outer}" cy="${outer}" r="${outer}" fill="#FFF1D2"/><circle cx="${outer}" cy="${outer}" r="${inner}" fill="#F3B23C"/></svg>`;
}

export function badgeSvg(variant: BadgeVariant): string {
  const theme = badgeTheme(variant.theme);
  const label = escapeHtml(badgeAlt());
  const name = escapeHtml(siteConfig.name);
  const { bg, stroke, kicker, name: nameColor } = theme;

  if (variant.shape === "horizontal") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${variant.width}" height="${variant.height}" viewBox="0 0 ${variant.width} ${variant.height}" role="img">
  <title>${label}</title>
  <rect x="1.5" y="1.5" width="${variant.width - 3}" height="${variant.height - 3}" rx="14" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
  <g transform="translate(12,12)">${sun(48)}</g>
  <text x="72" y="30" fill="${kicker}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.4">FEATURED ON</text>
  <text x="72" y="54" fill="${nameColor}" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700">${name}</text>
</svg>
`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${variant.width}" height="${variant.height}" viewBox="0 0 ${variant.width} ${variant.height}" role="img">
  <title>${label}</title>
  <rect x="1.5" y="1.5" width="${variant.width - 3}" height="${variant.height - 3}" rx="22" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
  <g transform="translate(68,28)">${sun(64)}</g>
  <text x="100" y="122" text-anchor="middle" fill="${kicker}" font-family="system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="1.6">FEATURED ON</text>
  <text x="100" y="156" text-anchor="middle" fill="${nameColor}" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="700">${name}</text>
</svg>
`;
}
