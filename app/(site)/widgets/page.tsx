import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/copy-block";
import { iframeSnippet, scriptSnippet, WIDGET_STORY_COUNT, widgetTitle } from "@/lib/partner-kit";
import { pageAlternates } from "@/lib/seo";
import { stateCounts } from "@/lib/stories";
import { STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "News widgets",
  description: `A headline widget for each state, plus the latest stories on ${siteConfig.name}. No cookies and no tracking.`,
  alternates: pageAlternates("/widgets"),
};

export default function WidgetsPage() {
  const counts = new Map(stateCounts().map((item) => [item.code, item.count]));
  const latestTitle = widgetTitle();

  return (
    <div className="page-block">
      <div className="wrap page-hero kit">
        <p className="kicker">For partners</p>
        <h1>News widgets</h1>
        <p className="lede">
          A short list of headlines a local outlet or a community site can drop onto a page. Each headline links back to {siteConfig.name}. The widget does not use cookies, analytics, or an account.
        </p>
        <p>
          The iframe is a small HTML page, up to {WIDGET_STORY_COUNT} stories, with no scripts inside it. The script option only inserts that same iframe. Paste either one where the list should appear. The frame is 340 pixels tall. Change the height if you want a shorter box. Part of the <Link href="/featured">featured kit</Link>.
        </p>

        <section id="latest">
          <h2>Latest stories</h2>
          <p>The newest stories on the site, including the world edition, linked from the homepage.</p>
          <iframe className="widget-preview" src="/embed/latest" title={latestTitle} loading="lazy" />
          <h3>Iframe</h3>
          <CopyBlock value={iframeSnippet({ place: "latest", title: latestTitle })} label="Copy latest iframe" />
          <h3>Script</h3>
          <CopyBlock value={scriptSnippet({ place: "latest", title: latestTitle })} label="Copy latest script" />
        </section>

        <section id="states">
          <h2>By state</h2>
          <p>
            Fifty states and the District of Columbia. A state with no stories yet still links to its page, and headlines appear there after a story is published. A story that names a second state is included in that state&apos;s list too.
          </p>
          <div className="widget-catalog">
            {STATES.map((state) => {
              const title = widgetTitle(state);
              const count = counts.get(state.code) ?? 0;
              return (
                <section key={state.code} id={state.slug} className="widget-row">
                  <h3>
                    <a href={`/embed/${state.slug}`}>{state.name}</a>
                  </h3>
                  <p className="blurb">{count === 0 ? "No stories yet. The widget still links to the state page." : `${count} ${count === 1 ? "story" : "stories"} on the state page.`}</p>
                  <CopyBlock value={iframeSnippet({ place: state.slug, title })} label={`Copy ${state.name} iframe`} />
                  <details className="snippet-details">
                    <summary>Script snippet for {state.name}</summary>
                    <CopyBlock value={scriptSnippet({ place: state.slug, title })} label={`Copy ${state.name} script`} />
                  </details>
                </section>
              );
            })}
          </div>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            A widget on your site, or a credit to fix: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. That is the only address.
          </p>
        </section>
      </div>
    </div>
  );
}
