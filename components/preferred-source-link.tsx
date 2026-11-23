import { siteConfig } from "@/site.config";

/**
 * Google Preferred Sources deeplink. A plain link only.
 * Do not load news.google.com publisher.js or any other third-party script.
 */
const HREF = `https://www.google.com/preferences/source?q=${siteConfig.domain}`;

const COPY = {
  label: `Add ${siteConfig.name} on Google`,
  helper: `Star ${siteConfig.name} as a preferred source so more good news shows up in your Google results.`,
};

export function PreferredSourceLink({ location }: { location: "footer" | "story" | "subscribe" }) {
  const helpId = `preferred-source-${location}-help`;
  return (
    <div className={`preferred-source preferred-source-${location}`}>
      <a className="preferred-source-link" href={HREF} target="_blank" rel="noopener" aria-describedby={helpId}>
        <svg className="preferred-source-star" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10 1.7 12.16 6.08 16.99 6.78 13.49 10.19 14.32 15.01 10 12.7 5.68 15.01 6.51 10.19 3.01 6.78 7.84 6.08 10 1.7z"
          />
        </svg>
        {COPY.label}
      </a>
      <p id={helpId} className="preferred-source-help">
        {COPY.helper}
      </p>
    </div>
  );
}
