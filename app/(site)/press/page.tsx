import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/copy-link";
import { JsonLd } from "@/components/json-ld";
import { SQUARE_LOGO } from "@/lib/brand";
import { formatStoryDate } from "@/lib/format";
import { placeLabel } from "@/lib/present";
import {
  PRESS_EDITORIAL_LINKS,
  PRESS_PATH,
  PRESS_TITLE,
  getPressSamples,
  pressBoilerplate,
  pressDescription,
  pressFacts,
  pressJsonLd,
  pressLogos,
} from "@/lib/press";
import { pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig, socialLinks } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const description = pressDescription();
  return {
    title: PRESS_TITLE,
    description,
    alternates: pageAlternates(PRESS_PATH),
    openGraph: {
      type: "website",
      url: PRESS_PATH,
      title: PRESS_TITLE,
      description,
      images: [
        {
          url: SQUARE_LOGO.path,
          alt: `${siteConfig.name} logo`,
          width: SQUARE_LOGO.width,
          height: SQUARE_LOGO.height,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title: PRESS_TITLE,
      description,
      images: [SQUARE_LOGO.path],
    },
  };
}

export default function PressPage() {
  const boilerplate = pressBoilerplate();
  const facts = pressFacts();
  const logos = pressLogos();
  const samples = getPressSamples();
  const socials = socialLinks();
  const mail = siteConfig.contactEmail;

  return (
    <div className="page-block">
      <JsonLd data={pressJsonLd(samples)} />
      <div className="wrap page-hero kit">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Press</span>
        </p>
        <p className="kicker">For journalists and news apps</p>
        <h1>Press kit</h1>
        <p className="lede">
          Boilerplate, logos, and sample stories for a pitch, a producer, or a news app. The public byline is the {siteConfig.editor.name}. {siteConfig.name} is owned by {siteConfig.owner.name}.
        </p>
        <p className="byline">
          Contact <a href={`mailto:${mail}`}>{mail}</a>
        </p>
        <nav className="jump-links" aria-label="On this page">
          <a href="#boilerplate">Boilerplate</a>
          <a href="#facts">Facts</a>
          <a href="#logos">Logos</a>
          <a href="#samples">Sample stories</a>
          <a href="#editorial">Editorial</a>
          {socials.length ? <a href="#social">Social</a> : null}
        </nav>

        <section id="boilerplate">
          <h2>Boilerplate</h2>
          <p>{siteConfig.tagline}.</p>
          <div className="cite-box">
            <p>{boilerplate}</p>
            <div className="cite-actions">
              <CopyLink value={boilerplate} label="Copy boilerplate" />
            </div>
          </div>
          <p>{siteConfig.verification}</p>
          <p>{siteConfig.editor.blurb}</p>
        </section>

        <section id="facts">
          <h2>Facts</h2>
          <dl className="press-facts">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt>{fact.term}</dt>
                <dd>{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="logos">
          <h2>Logos</h2>
          <p>Download the mark the site already publishes. These files are the same ones used for the icon, the feeds, and SmartNews.</p>
          <div className="press-logos">
            {logos.map((logo) => (
              <figure key={logo.id} style={logo.dark ? { background: "#1C2733" } : undefined}>
                {/* Brand files are generated routes, not optimized content images. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.href} alt={`${siteConfig.name} ${logo.label}`} width={logo.width} height={logo.height} />
                <figcaption>
                  <a href={logo.href} download>
                    Download {logo.label}
                  </a>
                  <span> · {logo.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="samples">
          <h2>Sample stories</h2>
          <p>Recent featured stories, then other high-quality stories from the archive. Each one links the original report on its story page.</p>
          {samples.length ? (
            <ul className="announce-list">
              {samples.map((story) => (
                <li key={story.slug}>
                  <Link href={`/story/${story.slug}`}>
                    <strong>{story.title}</strong>
                    <span>
                      {formatStoryDate(story.date)} · {placeLabel(story)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>Sample stories will show up here after the first one is published.</p>
          )}
        </section>

        <section id="editorial">
          <h2>Editorial</h2>
          <p className="link-pills">
            {PRESS_EDITORIAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </p>
          <p>
            Newsrooms and organizations named in a story can use the <Link href="/featured">featured kit</Link>. Questions about a correction go to <a href={`mailto:${mail}`}>{mail}</a> and the <Link href="/corrections">corrections page</Link>.
          </p>
        </section>

        {socials.length ? (
          <section id="social">
            <h2>Social</h2>
            <ul>
              {socials.map((social) => (
                <li key={social.href}>
                  <a href={social.href} target="_blank" rel="noopener noreferrer">
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
            <p>Only accounts this publication runs are listed. A blank handle stays off this page.</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
