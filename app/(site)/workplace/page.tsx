import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/copy-block";
import { JsonLd } from "@/components/json-ld";
import { LIBRARIES_PATH } from "@/lib/libraries";
import { listingMeta } from "@/lib/seo";
import { signatureAlt, signatureEmbedHtml, SIGNATURE_HEIGHT, SIGNATURE_WIDTH } from "@/lib/signature-badge";
import {
  WORKPLACE_PATH,
  WORKPLACE_RSS_PATH,
  digestsToPrerender,
  workplaceIndexJsonLd,
} from "@/lib/workplace";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Workplace good news digest";

function indexDescription(): string {
  return `A free weekly good-news post for Slack, Microsoft Teams, and an email signature. Stories on ${siteConfig.name} are verified and linked to the original report. Politics and violent crime stay off the list.`;
}

export function generateMetadata(): Metadata {
  const digests = digestsToPrerender();
  const newest = digests[digests.length - 1];
  return listingMeta({
    title: TITLE,
    description: indexDescription(),
    base: WORKPLACE_PATH,
    page: 1,
    total: 1,
    feedPath: WORKPLACE_RSS_PATH,
    image: newest?.image ? { url: newest.image, alt: newest.imageAlt || newest.title } : undefined,
  });
}

export default function WorkplacePage() {
  const digests = digestsToPrerender();
  const newestFirst = digests.slice().reverse();
  const description = indexDescription();
  const alt = signatureAlt();

  return (
    <div className="page-block">
      <JsonLd data={workplaceIndexJsonLd(digests)} />
      <div className="wrap page-hero kit">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Workplace digest</span>
        </p>
        <p className="kicker">For workplaces · free</p>
        <h1>Good news for the team channel.</h1>
        <p className="byline">{siteConfig.editor.name}</p>
        <p className="lede">{description}</p>
        <p>
          HR, a team lead, or a coworker can copy one post a week. It is plain text, so Slack and Microsoft Teams both take it. A small badge can sit under a name in an email signature. Nothing here is a paid placement, and the pages do not add a tracker.
        </p>
        <nav className="jump-links" aria-label="On this page">
          <a href="#program">The program</a>
          <a href="#slack">Slack</a>
          <a href="#teams">Microsoft Teams</a>
          <a href="#signature">Email signature</a>
          <a href="#weeks">Weekly posts</a>
        </nav>
        <p className="link-pills">
          <Link href="/subscribe">Daily Top 5 email</Link>
          <Link href="/submit">Submit a story</Link>
          <Link href={LIBRARIES_PATH}>Library shelf</Link>
          <Link href="/featured">Featured kit</Link>
          <a href={WORKPLACE_RSS_PATH}>Weekly RSS</a>
        </p>

        <section id="program">
          <h2>What the program is</h2>
          <p>
            Each Monday-start week gets a page once the archive has a few stories that fit a workplace. The clock is Mountain Time, the same clock as the morning edition. A post holds about five stories from that Monday through Sunday.
          </p>
          <p>
            The pick leaves out politics, violence, use of force, shootings, and heavy crime. When the week has them, kid-friendly stories, kindness, community, animals, and health breakthroughs come first. {siteConfig.verification}
          </p>
          <p>
            Double credit is the rule for a shared post. Each line links to the story on {siteConfig.name}, and that story links to the original newsroom. The sign-off names {siteConfig.name}. The reporter who did the work stays visible, and so does this desk.
          </p>
          <p>
            There is no new signup for this program. The <Link href="/subscribe">daily Top 5 email</Link> is the existing list. A tip still goes through <Link href="/submit">submit a story</Link>. Write <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> if a credit needs a fix. That is the only address.
          </p>
        </section>

        <section id="slack">
          <h2>Slack</h2>
          <ol>
            <li>Open the week you want from the list below.</li>
            <li>Choose Copy Slack and Teams text. The block is plain text, about 800 to 1,200 characters.</li>
            <li>Paste it into a channel. Slack turns each address into a link.</li>
            <li>Leave the sign-off in place so the post still names {siteConfig.name} and the original stories.</li>
          </ol>
        </section>

        <section id="teams">
          <h2>Microsoft Teams</h2>
          <ol>
            <li>Use the same block. You do not need a different version for Teams.</li>
            <li>Paste it into a channel post or a chat. Teams linkifies the story addresses.</li>
            <li>If you would rather send it as email, use the HTML version on the week page. It is a simple table, with no images and no tracking pixel.</li>
          </ol>
        </section>

        <section id="signature">
          <h2>Email signature badge</h2>
          <p>
            A small mark under your name. It links to {siteConfig.name} and does not set a cookie or report that it was viewed. The PNG is the safer paste for Outlook and Gmail. The SVG stays sharp on a web page.
          </p>
          {/* The badge is a small generated SVG. The image optimizer is off, same as the featured badges. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="signature-badge" src="/brand/signature.svg" width={SIGNATURE_WIDTH} height={SIGNATURE_HEIGHT} alt={alt} />
          <h3>PNG, for email</h3>
          <CopyBlock value={signatureEmbedHtml("png")} label="Copy PNG signature" />
          <h3>SVG, for a website</h3>
          <CopyBlock value={signatureEmbedHtml("svg")} label="Copy SVG signature" />
          <p>
            In Gmail, Outlook, or Apple Mail, open the signature settings and paste the HTML where the client accepts it. If it pastes as code instead of an image, use the image address in the snippet and set the link to the site home. The badge is {SIGNATURE_WIDTH} by {SIGNATURE_HEIGHT} pixels.
          </p>
        </section>

        <section id="weeks">
          <h2>Weekly posts</h2>
          <p>The newest week is first. An open week is marked until Sunday is over. The RSS feed skips that open week so a subscriber does not get a post that is still changing.</p>
          {digests.length ? (
            <ul className="announce-list">
              {newestFirst.map((digest) => (
                <li key={digest.start}>
                  <Link href={digest.path}>
                    <span className="kicker">{digest.inProgress ? "This week" : "Week"}</span>
                    <strong>{digest.rangeLabel}</strong>
                    <span>
                      {digest.stories.length} stories · {digest.plainText.length} characters
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>A week shows up here once it has enough stories that fit a workplace.</p>
          )}
        </section>
      </div>
    </div>
  );
}
