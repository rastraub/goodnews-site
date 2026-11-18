import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/copy-block";
import { CopyLink } from "@/components/copy-link";
import { JsonLd } from "@/components/json-ld";
import { PrintButton } from "../kids/print-button";
import { plainStoryText } from "@/lib/feed";
import { formatStoryDate } from "@/lib/format";
import { placeLabel } from "@/lib/present";
import { absoluteUrl, pageAlternates, webPageJsonLd } from "@/lib/seo";
import { STATES } from "@/lib/states";
import {
  WIRE_FEED_PATH,
  WIRE_JSON_PATH,
  WIRE_KIDS_FEED_PATH,
  WIRE_KIDS_JSON_PATH,
  WIRE_PATH,
  storyWireUrl,
  wireCreditHtml,
  wireNewsletter,
  wireStateFeedPath,
} from "@/lib/wire";
import { siteConfig } from "@/site.config";

const TITLE = "Good News Wire";
const DESCRIPTION = `Republish short summaries from ${siteConfig.name} for free. Credit this site and the original newsroom. Photos are not included.`;

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates(WIRE_PATH, WIRE_FEED_PATH),
};

const FEEDS = [
  { title: "All summaries, RSS", path: WIRE_FEED_PATH },
  { title: "All summaries, JSON", path: WIRE_JSON_PATH },
  { title: "Classroom summaries, RSS", path: WIRE_KIDS_FEED_PATH },
  { title: "Classroom summaries, JSON", path: WIRE_KIDS_JSON_PATH },
];

export default function WirePage() {
  const newsletter = wireNewsletter();
  const example = newsletter.stories[0];
  const mail = siteConfig.contactEmail;

  return (
    <div className="page-block wire-page">
      <JsonLd
        data={webPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: WIRE_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: WIRE_PATH },
          ],
        })}
      />
      <div className="wrap page-hero prose-page">
        <div className="wire-screen">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>{TITLE}</span>
          </p>
          <p className="kicker">For publishers</p>
          <h1>Good News Wire</h1>
          <p className="lede">
            A free way for a local paper, a school newsletter, a library bulletin, a church, an HOA, or any other small publisher to run {siteConfig.name}&apos;s short summaries. You keep the credit. Readers can get back to the story, and to the newsroom that reported it.
          </p>
          <nav className="jump-links" aria-label="On this page">
            <a href="#who">Who it&apos;s for</a>
            <a href="#what">What you may run</a>
            <a href="#credit">Credit</a>
            <a href="#rules">Rules</a>
            <a href="#photos">Photos</a>
            <a href="#newsletter">This week&apos;s 5</a>
            <a href="#bulletin">Print bulletin</a>
            <a href="#feeds">Feeds</a>
            <a href="#removal">Removal</a>
            <a href="#contact">Contact</a>
          </nav>

          <section id="who">
            <h2>Who it&apos;s for</h2>
            <p>
              Local outlets and community publishers. A weekly newsletter, a one-page bulletin, a library handout, a congregation email, a neighborhood association note, or a town site. Large or small is fine. You do not need to ask first.
            </p>
          </section>

          <section id="what">
            <h2>What you may republish</h2>
            <p>
              Headlines and summaries written by {siteConfig.name}. That is the headline, the short deck, and the summary on the story page. A classroom item also includes the version written for a teacher to read aloud.
            </p>
            <p>
              You may not republish the original newsroom&apos;s article, its headline, or its photos. Those belong to the newsroom that reported the story. Link to that report. Do not paste it.
            </p>
          </section>

          <section id="credit">
            <h2>The credit line</h2>
            <p>
              Every summary you use needs both credits, with working links. One link goes to the story on {siteConfig.name}. The other names the newsroom and links to its report. Do not drop either one.
            </p>
            {example ? (
              <blockquote dangerouslySetInnerHTML={{ __html: wireCreditHtml(example) }} />
            ) : (
              <p>
                Summary from {siteConfig.name}, with a link to the story, then the original newsroom, with a link to its report.
              </p>
            )}
            <p>
              On a website, the link to the story on {siteConfig.name} should use <code>rel=&quot;canonical&quot;</code>. That tells search engines the summary lives here. The copy blocks below already include it. A paper bulletin can print the addresses instead.
            </p>
          </section>

          <section id="rules">
            <h2>How to use a summary</h2>
            <ul>
              <li>You may run it for free. A church bulletin and a commercial newsletter are both fine. There is no fee and no written permission.</li>
              <li>You may fix a typo or cut a sentence for space. The shorter version has to say the same thing. Do not add a fact, change a number, or put a headline on it that the summary does not support.</li>
              <li>Do not write it so readers would think {siteConfig.name} endorses your organization, or that you speak for {siteConfig.name}. Running a summary is not a partnership.</li>
              <li>Keep the headline honest. Do not add a claim the summary does not make.</li>
            </ul>
          </section>

          <section id="photos">
            <h2>Photos</h2>
            <p>
              The wire does not include photos. Story photos are credited to other people, under those photos&apos; own licenses. They are not ours to hand out with a summary. Leave the picture off unless a future story says, in its photo credit, that {siteConfig.name} owns it. If you are not sure, leave it off.
            </p>
          </section>

          <section id="newsletter">
            <h2>This week&apos;s 5 for your newsletter</h2>
            <p>
              {newsletter.stories.length
                ? newsletter.rangeLabel === "Latest summaries"
                  ? "These are the latest summaries."
                  : newsletter.earlierWeek
                    ? `These are from ${newsletter.rangeLabel}, the latest week with summaries.`
                    : `These are the top stories for ${newsletter.rangeLabel}.`
                : "No summary is ready to copy yet."}{" "}
              The HTML block is for a newsletter or a web page. The plain-text block is for email or a document. Each item already ends with the credit line, so a paste keeps the credit.
            </p>
            {newsletter.html ? (
              <div className="wire-preview" dangerouslySetInnerHTML={{ __html: newsletter.html }} />
            ) : null}
            <h3>HTML</h3>
            <CopyBlock value={newsletter.html} label="Copy HTML" />
            <h3>Plain text</h3>
            <CopyBlock value={newsletter.text} label="Copy plain text" />
          </section>
        </div>

        <section className="wire-bulletin" id="bulletin" aria-label="Print bulletin">
          <p className="kicker">{siteConfig.name}</p>
          <h2>Good news this week</h2>
          <p>
            {newsletter.stories.length
              ? newsletter.rangeLabel
              : "Summaries will appear here after the next edition."}
          </p>
          {newsletter.stories.length ? (
            <ol>
              {newsletter.stories.map((story) => (
                <li key={story.slug}>
                  <p>
                    <a href={storyWireUrl(story.slug)} rel="canonical">
                      <strong>{story.title}</strong>
                    </a>
                  </p>
                  <p>
                    {placeLabel(story)} · {formatStoryDate(story.date)}
                  </p>
                  <p>{plainStoryText(story.dek)}</p>
                  <p className="wire-credit">
                    Summary from <a href={storyWireUrl(story.slug)} rel="canonical">{siteConfig.name}</a>. Original reporting by{" "}
                    <a href={story.sourceUrl}>{story.sourceName}</a>.
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
          <p className="wire-credit">
            Republish these summaries with the credit above. Terms: <a href={absoluteUrl(WIRE_PATH)}>{absoluteUrl(WIRE_PATH)}</a>
          </p>
          <div className="print-actions">
            <PrintButton label="Print this bulletin" />
          </div>
        </section>

        <div className="wire-screen">
          <section id="feeds">
            <h2>Feeds</h2>
            <p>
              The feeds are built with the site. Each item has the full summary, the credit line, the link to the story, and the link to the original report. Classroom feeds use stories marked for teachers, and they use the classroom summary. A state feed uses that state&apos;s stories, the same list as the state page. The <Link href="/feeds">feeds page</Link> has a copy button for each address, plus Feedly and Inoreader.
            </p>
            {FEEDS.map((feed) => {
              const url = absoluteUrl(feed.path);
              return (
                <div className="feed-row" key={feed.path}>
                  <div className="name">
                    <a href={url}>{feed.title}</a>
                    <span className="blurb">{url}</span>
                  </div>
                  <div className="feed-actions">
                    <CopyLink value={url} />
                  </div>
                </div>
              );
            })}
            <h3>By state</h3>
            <div className="link-pills">
              {STATES.map((state) => (
                <a key={state.code} href={absoluteUrl(wireStateFeedPath(state.slug))}>
                  {state.name}
                </a>
              ))}
            </div>
          </section>

          <section id="removal">
            <h2>Removal and corrections</h2>
            <p>
              If a summary should come down, or a credit is wrong, email <a href={`mailto:${mail}?subject=Good%20News%20Wire`}>{mail}</a> or use the <Link href="/contact">contact page</Link> or the <Link href="/submit">tip form</Link>. Tell us which summary and where it ran. Please take down a copy we ask you to remove.
            </p>
            <p>
              If we correct a story, update your copy or remove it. Corrections are listed on the <Link href="/corrections">corrections page</Link>, and a correction note is included in the wire item.
            </p>
          </section>

          <section id="contact">
            <h2>Contact</h2>
            <p>
              Questions about the wire go to <a href={`mailto:${mail}`}>{mail}</a>. That is the only address. The <Link href="/editorial-standards">editorial standards</Link> explain how a summary is checked, and the <Link href="/featured">partner kit</Link> is the badge for a newsroom named in a story.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
