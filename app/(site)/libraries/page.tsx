import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/copy-block";
import { JsonLd } from "@/components/json-ld";
import { QrCode } from "@/components/qr-code";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { libraryBulletin, libraryJsonLd, libraryTools, LIBRARIES_PATH, routePageExists } from "@/lib/libraries";
import { absoluteUrl, pageAlternates } from "@/lib/seo";
import { WORKPLACE_PATH } from "@/lib/workplace";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good News Shelf for libraries";

function description(): string {
  return `A free kit for public libraries from ${siteConfig.name}: a printable shelf talker, a large-print edition, and stories for kids. No account, no fee, and no student data.`;
}

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: description(),
    alternates: pageAlternates(LIBRARIES_PATH),
  };
}

export default function LibrariesPage() {
  const { ready, upcoming } = libraryTools();
  const bulletin = libraryBulletin();
  const shelfUrl = absoluteUrl(LIBRARIES_PATH);
  const largePrintUrl = absoluteUrl("/large-print");
  const kidsUrl = absoluteUrl("/kids");
  const largePrintReady = routePageExists("/large-print");

  return (
    <div className="page-block library-page">
      <JsonLd data={libraryJsonLd()} />
      <div className="wrap page-hero kit no-print">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Library shelf</span>
        </p>
        <p className="kicker">For public libraries · free</p>
        <h1>A Good News Shelf.</h1>
        <p className="byline">{siteConfig.editor.name}</p>
        <p className="lede">{description()}</p>
        <p>
          A branch can point patrons at stories that are already published. There is no library account, no invoice, and no login. Print a shelf talker, tape a QR code to a bulletin board, or paste a short blurb into a newsletter.
        </p>
        <nav className="jump-links" aria-label="On this page">
          <a href="#kit">What you get</a>
          <a href="#how">How to use it</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">Questions</a>
          <a href="#bulletin">Bulletin blurb</a>
          <a href="#shelf">Shelf talkers</a>
        </nav>
        <p className="link-pills">
          <Link href="/kids">Stories for kids</Link>
          <Link href="/large-print">Large print</Link>
          <Link href="/classroom">Good News Friday</Link>
          <Link href={WORKPLACE_PATH}>Workplace digest</Link>
          <Link href="/submit">Submit a story</Link>
        </p>

        <section id="kit">
          <h2>What a library gets</h2>
          <ul className="kit-list">
            {ready.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href}>
                  {tool.label}
                  <small>{tool.note}</small>
                </Link>
              </li>
            ))}
          </ul>
          {largePrintReady ? null : (
            <p>
              Large print is linked at /large-print. If that page is still being added, keep the address on the card. It is the path patrons should use.
            </p>
          )}
          {upcoming.length ? (
            <p>
              {upcoming.map((tool) => `${tool.label} (${tool.href})`).join(" and ")}{" "}
              {upcoming.length === 1 ? "is" : "are"} not on this edition yet. This page does not link{" "}
              {upcoming.length === 1 ? "that address" : "those addresses"} until the{" "}
              {upcoming.length === 1 ? "page exists" : "pages exist"}.
            </p>
          ) : null}
        </section>

        <section id="how">
          <h2>How to put it on a shelf</h2>
          <ol>
            <li>Print the cards below. There is a large shelf talker, a medium card for large print, and a smaller card for kids.</li>
            <li>Stand the large card on an end panel, or pin it to a bulletin board.</li>
            <li>The QR code opens the matching page. The address is also printed in large type, in case a camera misses the code.</li>
            <li>Paste the bulletin blurb into a newsletter or a desk slide. It names the three addresses and nothing else.</li>
          </ol>
          <p>
            Staff do not create an account. Patrons do not either. A storytime can use <Link href="/morning-announcements">morning announcements</Link> or the <Link href="/classroom">Friday pack</Link> without sending a name back to {siteConfig.name}.
          </p>
        </section>

        <section id="privacy">
          <h2>Privacy, including children</h2>
          <p>
            This shelf does not collect a student&apos;s or a patron&apos;s name, age, school, library card, or email. The kids pages are written for an adult to read with a child, and they do not ask for a child&apos;s information. {siteConfig.name} does not add an advertising or analytics kit to these pages.
          </p>
          <p>
            A tip about a story still uses the existing <Link href="/submit">submit form</Link>, which asks an adult for a name and an email. The <Link href="/privacy">privacy page</Link> is the longer version of that rule. Questions go to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>, the only address.
          </p>
        </section>

        <section id="faq">
          <h2>Questions librarians ask</h2>
          <div className="faq-list">
            <details>
              <summary>Does this cost anything?</summary>
              <p>No. There is no fee, no invoice, and no paid tier for libraries.</p>
            </details>
            <details>
              <summary>Do we need an account?</summary>
              <p>No. Print the cards or share the addresses. Staff and patrons both stay signed out.</p>
            </details>
            <details>
              <summary>Can we photocopy the shelf talker?</summary>
              <p>Yes. Print this page and copy the cards. They are meant for a shelf, a desk, or a bulletin board.</p>
            </details>
            <details>
              <summary>Are the stories checked?</summary>
              <p>{siteConfig.verification}</p>
            </details>
            <details>
              <summary>Who do we write if a link is wrong?</summary>
              <p>
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. That mailbox is the whole contact list.
              </p>
            </details>
          </div>
        </section>

        <section id="bulletin">
          <h2>Bulletin blurb</h2>
          <p>Paste this into a newsletter, a slide, or a post. It does not name a branch or a person.</p>
          <CopyBlock value={bulletin} label="Copy bulletin blurb" />
        </section>
      </div>

      <div className="wrap shelf-print" id="shelf">
        <div className="no-print">
          <h2 className="announce-subhead">Shelf talkers</h2>
          <p className="lede">Three sizes. Print this page and the rest of the kit stays off the paper.</p>
          <div className="announce-actions">
            <PrintButton label="Print shelf talkers" />
          </div>
        </div>
        <article className="shelf-card talker-lg">
          <QrCode className="qr-code" value={shelfUrl} title={`QR code for the ${siteConfig.name} library shelf`} />
          <div>
            <p className="kicker">{siteConfig.name}</p>
            <h2>Good news, on the shelf.</h2>
            <p>Free verified stories. No account. No politics.</p>
            <a className="shelf-url" href={shelfUrl}>
              {shelfUrl}
            </a>
          </div>
        </article>
        <div className="shelf-pair">
          <article className="shelf-card talker-md">
            <QrCode className="qr-code" value={largePrintUrl} title={`QR code for large print on ${siteConfig.name}`} />
            <div>
              <p className="kicker">Large print</p>
              <h2>Bigger type.</h2>
              <p>A calmer page for a reading room.</p>
              <a className="shelf-url" href={largePrintUrl}>
                {largePrintUrl}
              </a>
            </div>
          </article>
          <article className="shelf-card talker-sm">
            <QrCode className="qr-code" value={kidsUrl} title={`QR code for kids' stories on ${siteConfig.name}`} />
            <div>
              <p className="kicker">For kids</p>
              <h2>Read one together.</h2>
              <p>Stories an adult can read with a child.</p>
              <a className="shelf-url" href={kidsUrl}>
                {kidsUrl}
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
