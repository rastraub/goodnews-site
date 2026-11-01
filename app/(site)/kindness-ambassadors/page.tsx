import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import {
  AMBASSADOR_CERTIFICATE_PATH,
  AMBASSADOR_DESCRIPTION,
  AMBASSADOR_SHARE,
  AMBASSADOR_TITLE,
  AMBASSADORS_PATH,
  ambassadorReportHref,
  ambassadorSignupHref,
  shoutoutsPath,
} from "@/lib/ambassador-tip";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import {
  ambassadorFaqs,
  ambassadorsJsonLd,
  currentAmbassadorMonth,
  formatAmbassadorMonth,
  indexableShoutoutMonths,
} from "@/lib/kindness-ambassadors";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const WHO = [
  { title: "K-12 classrooms", text: "A teacher leads one small act a week and reads a story aloud." },
  { title: "Libraries", text: "A school library or a public library can join as one group." },
  { title: "Scouts", text: "A troop can pick an act that stays with people the scouts already know." },
  { title: "Youth groups", text: "A club or youth group sends one note from the adult leader." },
  { title: "Homeschool groups", text: "A family group or co-op can join the same way a class does." },
];

export function generateMetadata(): Metadata {
  return listingMeta({
    title: AMBASSADOR_TITLE,
    description: AMBASSADOR_DESCRIPTION,
    base: AMBASSADORS_PATH,
    page: 1,
    total: 1,
  });
}

export default function KindnessAmbassadorsPage() {
  const faqs = ambassadorFaqs();
  const month = currentAmbassadorMonth();
  const featured = indexableShoutoutMonths().slice().reverse();
  const shareText = `${AMBASSADOR_SHARE} — ${siteConfig.name}`;

  return (
    <div className="page-block">
      <JsonLd data={ambassadorsJsonLd(faqs)} />
      <div className="wrap page-hero kindness-layout">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Kindness Ambassadors</span>
        </p>
        <p className="kicker">For classes and student groups</p>
        <h1>Kindness Ambassadors.</h1>
        <p className="lede">{AMBASSADOR_DESCRIPTION}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          <Link href={ambassadorSignupHref()}>Join the program</Link>
          <Link href={AMBASSADOR_CERTIFICATE_PATH}>Print a certificate</Link>
          <Link href={shoutoutsPath(month)}>This month&apos;s shoutouts</Link>
          <Link href="/kids">Classroom stories</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
        </p>
      </div>
      <div className="wrap kindness-layout" style={{ paddingTop: 8 }}>
        <section aria-labelledby="what">
          <h2 id="what">What the program is</h2>
          <p>
            A class or student group commits to one small, free act of kindness a week. A teacher reads a kid-friendly story from {siteConfig.name}, and the group sends in what they did. The act stays small. It does not ask anyone to spend money or to meet someone new.
          </p>
          <p>
            The weekly idea lives on the <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>. Stories a teacher can read aloud live in the <Link href="/kids">classroom section</Link>.
          </p>
        </section>
        <section aria-labelledby="who">
          <h2 id="who">Who it is for</h2>
          <div className="ambassador-points">
            {WHO.map((item) => (
              <article key={item.title} className="ambassador-point">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="join">
          <h2 id="join">How to join</h2>
          <ol className="questions">
            <li>A teacher or group leader sends one signup for the class. Students do not sign up on their own.</li>
            <li>Each week, read one kid-friendly story and do one small, free act of kindness.</li>
            <li>Send what the class did. Editors may feature the group on that month&apos;s shoutouts page.</li>
          </ol>
          <p className="print-actions">
            <Link className="btn btn-ink" href={ambassadorSignupHref()}>
              Kindness Ambassadors class signup
            </Link>
          </p>
          <p className="link-pills">
            <Link href={ambassadorReportHref()}>Ambassador classes: tell us how it went</Link>
          </p>
          <p className="teacher-note">
            The signup is the same tip form as every other note. It is emailed to {siteConfig.contactEmail}. It asks only for a first name or the group name, the school or group, city, state or country, grade range, and an email.
          </p>
        </section>
        <section className="classroom-box" id="privacy" aria-labelledby="privacy-title">
          <h2 id="privacy-title">No student names or photos of children</h2>
          <p>
            Do not send student names. Do not send photos of children. A shoutout shows the group name, the city and state or country, and the act. That is all. The printable certificate has a blank for the class or group, not for a student.
          </p>
        </section>
        <section aria-labelledby="shoutouts">
          <h2 id="shoutouts">Classroom shoutouts</h2>
          <p>
            Shoutouts are written by hand from notes teachers send. {formatAmbassadorMonth(month)} is the current month.
          </p>
          <p className="link-pills">
            <Link href={shoutoutsPath(month)}>Shoutouts for {formatAmbassadorMonth(month)}</Link>
            <Link href={AMBASSADOR_CERTIFICATE_PATH}>Print a certificate</Link>
          </p>
          {featured.length ? (
            <ul className="questions">
              {featured.map((item) => (
                <li key={item}>
                  <Link href={shoutoutsPath(item)}>{formatAmbassadorMonth(item)}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No class has been featured yet. The first note that fits can be the first shoutout.</p>
          )}
        </section>
        <section aria-labelledby="faq">
          <h2 id="faq">Teacher FAQ</h2>
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </section>
        <section className="kind-share" aria-labelledby="share">
          <h2 id="share">Share the program</h2>
          <p className="kind-share-text">{AMBASSADOR_SHARE}</p>
          <div className="no-print">
            <ShareButtons title={AMBASSADOR_TITLE} path={AMBASSADORS_PATH} text={shareText} />
          </div>
        </section>
      </div>
      <div className="no-print">
        <EmailSignup id="ambassador-teachers" interest="teachers" />
      </div>
    </div>
  );
}
