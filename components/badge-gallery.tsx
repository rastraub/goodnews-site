import { CopyBlock } from "./copy-block";
import { badgeEmbedHtml } from "@/lib/partner-kit";
import { BADGE_VARIANTS, badgeAlt, badgePath } from "@/lib/badges";
import { siteConfig } from "@/site.config";

export function BadgeGallery({ storyHref }: { storyHref?: string }) {
  const fileName = siteConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "badge";
  return (
    <ul className="badge-grid">
      {BADGE_VARIANTS.map((variant) => (
        <li key={variant.id} className="badge-card">
          <div className="badge-stage">
            {/* The global img rule crops photos. This preview needs the badge's real box. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="badge-img"
              src={badgePath(variant, "svg")}
              alt={`${badgeAlt()}, ${variant.label}`}
              width={variant.width}
              height={variant.height}
            />
          </div>
          <p>{variant.label}</p>
          <div className="badge-actions">
            <a className="btn btn-outline" href={badgePath(variant, "svg")} download={`${fileName}-featured-${variant.id}.svg`}>
              SVG
            </a>
            <a className="btn btn-outline" href={badgePath(variant, "png")} download={`${fileName}-featured-${variant.id}.png`}>
              PNG
            </a>
          </div>
          {storyHref ? (
            <>
              <CopyBlock value={badgeEmbedHtml({ variant, href: storyHref, format: "svg" })} label="Copy SVG embed" />
              <CopyBlock value={badgeEmbedHtml({ variant, href: storyHref, format: "png" })} label="Copy PNG embed" />
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
