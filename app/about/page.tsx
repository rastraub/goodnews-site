import type { Metadata } from "next";
import Link from "next/link";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "About",
  description: `${siteConfig.name} publishes verified good news from the United States and from other countries. Every story links to the original report. No politics, no clickbait, no pop-ups.`,
  alternates: pageAlternates("/about"),
};

export default function AboutPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Our promise</p>
        <h1>Good news, checked.</h1>
        <p className="lede">
          {siteConfig.name} publishes verified, uplifting stories from the United States and from other countries. We link the original report on every story. We do not do politics, clickbait, or pop-ups.
        </p>

        <section id="mission">
          <h2>Our mission</h2>
          <p>
            The job is simple: find something true and hopeful, check it against the original reporting, and put it where a reader can share it without a pit in their stomach. We cover kindness, neighbors, animals, science, health advances that are already helping people, and towns that showed up for someone.
          </p>
          <p>
            Stories come from all 50 states, Washington, D.C., and countries beyond the United States. You can start with <Link href="/">today</Link>, browse <Link href="/local">by state</Link>, read the <Link href="/world">world edition</Link>, or follow a <Link href="/category/community">topic</Link>.
          </p>
        </section>

        <section className="promise-card" id="no-politics">
          <h2>No politics. Ever.</h2>
          <p>
            <strong>No candidates, parties, elections, or culture-war topics.</strong> A bill, a campaign, or a protest is out, even when the outcome feels happy to someone. If a story&apos;s goodness depends on who you voted for, it does not belong here.
          </p>
          <p>Kindness, science, neighbors, animals, health advances already helping people, and local comebacks are in.</p>
        </section>

        <section id="how-we-verify">
          <h2>How a story gets published</h2>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <div>
                <h3>Find</h3>
                <p>Editors read local news, press releases, and reader tips every day.</p>
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div>
                <h3>Screen</h3>
                <p>Is it uplifting? Is it free of politics? Would the original newsroom recognize the headline?</p>
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div>
                <h3>Verify</h3>
                <p>The facts in our summary have to be in the original report. We link that report, and we do not invent quotes.</p>
              </div>
            </div>
            <div className="step">
              <div className="n">4</div>
              <div>
                <h3>Approve</h3>
                <p>A human editor reads the summary against the original and signs off before anything is published.</p>
              </div>
            </div>
            <div className="step">
              <div className="n">5</div>
              <div>
                <h3>Correct</h3>
                <p>
                  If we get something wrong, we say so on the story and on the <Link href="/corrections">corrections page</Link>. The full rules are on <Link href="/editorial-standards">editorial standards</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <h2>About the photos</h2>
        <p>
          The photograph on a story is illustrative unless the caption says it shows the people, animals, or place in the report. We name the photographer and the license under every picture.
        </p>

        <section id="masthead">
          <h2>Masthead</h2>
          <p>
            <strong>{siteConfig.editor.name}</strong>
          </p>
          <p>{siteConfig.editor.blurb}</p>
          <p>
            Story tips, corrections, and press notes go to <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>, or through the <Link href="/contact">contact page</Link>.
          </p>
        </section>

        <section id="funding">
          <h2>Independence</h2>
          <p>
            {siteConfig.name} is an independent publication. A reader membership, meant to keep the site ad-free, is planned, and billing is not open yet. A sponsor may underwrite a clearly labeled series. Sponsors do not choose, edit, or kill stories.
          </p>
          <p>
            The rules on the <Link href="/editorial-standards">editorial standards</Link> page apply either way. Questions about a partnership start at <Link href="/partner">partner with us</Link>.
          </p>
        </section>

        <section id="featured">
          <h2>If we covered you</h2>
          <p>
            Newsrooms, nonprofits, schools, and reporters named in a story can use a badge that links back. The <Link href="/featured">featured kit</Link> has the image, the embed code, and short text for a post. A local site can also add a <Link href="/widgets">headline widget</Link>.
          </p>
        </section>

        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/submit">Submit a story</Link>
        </p>
      </div>
    </div>
  );
}
