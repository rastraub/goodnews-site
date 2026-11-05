/**
 * A small email-signature badge. The wordmark comes from site config.
 * SVG stays sharp. PNG is the same drawing for clients that skip SVG.
 * Neither file phones home or sets a cookie.
 */
import { escapeHtml } from "./tip-mail";
import { siteConfig } from "@/site.config";

export const SIGNATURE_WIDTH = 180;
export const SIGNATURE_HEIGHT = 40;

export function signatureAlt(): string {
  return `I read good news on ${siteConfig.name}`;
}

export function signaturePath(format: "svg" | "png"): string {
  return `/brand/signature.${format}`;
}

function nameSize(name: string): number {
  if (name.length > 16) return 11;
  if (name.length > 12) return 13;
  if (name.length > 9) return 14;
  return 16;
}

function sun(size: number): string {
  const outer = size / 2;
  const inner = (size * 0.46) / 2;
  return `<svg x="0" y="0" width="${size}" height="${size}" aria-hidden="true"><circle cx="${outer}" cy="${outer}" r="${outer}" fill="#FFF1D2"/><circle cx="${outer}" cy="${outer}" r="${inner}" fill="#F3B23C"/></svg>`;
}

export function signatureSvg(): string {
  const alt = escapeHtml(signatureAlt());
  const name = escapeHtml(siteConfig.name);
  const size = nameSize(siteConfig.name);
  const nameY = 31;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIGNATURE_WIDTH}" height="${SIGNATURE_HEIGHT}" viewBox="0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}" role="img">
  <title>${alt}</title>
  <rect x="0.5" y="0.5" width="${SIGNATURE_WIDTH - 1}" height="${SIGNATURE_HEIGHT - 1}" rx="8" fill="#FFFBF4" stroke="#E4D3B0"/>
  <g transform="translate(6,6)">${sun(28)}</g>
  <text x="40" y="16" fill="#8F5E00" font-family="system-ui, sans-serif" font-size="8" font-weight="700" letter-spacing="0.4">I READ GOOD NEWS ON</text>
  <text x="40" y="${nameY}" fill="#1C2733" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="700">${name}</text>
</svg>
`;
}

/** Paste-ready image link. The href is the publication home, not a tracking URL. */
export function signatureEmbedHtml(format: "svg" | "png" = "png"): string {
  const src = `${siteConfig.url}${signaturePath(format)}`;
  return `<a href="${escapeHtml(siteConfig.url)}"><img src="${escapeHtml(src)}" width="${SIGNATURE_WIDTH}" height="${SIGNATURE_HEIGHT}" alt="${escapeHtml(signatureAlt())}" /></a>`;
}
