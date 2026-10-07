import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "How we verify",
  description: `How ${siteConfig.name} checks stories, and the promise to stay out of politics.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Our promise</p>
        <h1>Trust is the whole point.</h1>
        <p className="lede">
          {siteConfig.name} publishes verified, uplifting stories from the United States. We link the original report on every story. We do not do politics, clickbait, or pop-ups.
        </p>
        <section className="promise-card" id="no-politics">
          <h2>No politics. Ever.</h2>
          <p>
            <strong>No candidates, parties, elections, or culture-war topics.</strong> A bill, a campaign, or a protest is out, even when the outcome feels happy to someone. If a story&apos;s goodness depends on who you voted for, it does not belong here.
          </p>
          <p>Kindness, science, neighbors, animals, and local comebacks are in.</p>
        </section>
        <h2>How a story gets published</h2>
        <div className="steps">
          <div className="step">
            <div className="n">1</div>
            <div>
              <h3>Find</h3>
              <p>Editors and a daily pipeline look at local news, press releases, and reader tips.</p>
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
              <p>A human editor signs off. A story file cannot publish until it sets editorApproved to true. The schema rejects anything else.</p>
            </div>
          </div>
          <div className="step">
            <div className="n">5</div>
            <div>
              <h3>Correct</h3>
              <p>
                If we get something wrong, we say so on the story and on the <Link href="/corrections">corrections page</Link>.
              </p>
            </div>
          </div>
        </div>
        <h2>About the photos</h2>
        <p>
          Photos are license-safe stand-ins stored in this repo. They are not pictures of the people or animals in the story unless a caption says so. Every story names the photographer and the license.
        </p>
        <h2>About us</h2>
        <p>
          {siteConfig.name} is a small newsroom with a simple job: five true, hopeful stories, checked, sourced, and easy to share. The name, the tagline, and the domain live in one config file so a rename does not mean a rewrite.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/submit">Submit a story</Link>
        </p>
      </div>
    </div>
  );
}
