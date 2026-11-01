import type { Metadata } from "next";
import Link from "next/link";
import { SubmitForm } from "@/components/submit-form";
import {
  AMBASSADORS_PATH,
  AMBASSADOR_DESCRIPTION,
  ambassadorFormMode,
} from "@/lib/ambassador-tip";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

type Props = { searchParams: Promise<{ type?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const mode = ambassadorFormMode((await searchParams).type);
  if (mode === "ambassador-signup") {
    return {
      title: "Kindness Ambassadors class signup",
      description: AMBASSADOR_DESCRIPTION,
      alternates: pageAlternates(AMBASSADORS_PATH),
      robots: { index: false, follow: true },
    };
  }
  if (mode === "ambassador-report") {
    return {
      title: "Tell us how the kindness challenge went",
      description: "Ambassador classes can send what they did. The note does not ask for student names or photos of children.",
      alternates: pageAlternates(AMBASSADORS_PATH),
      robots: { index: false, follow: true },
    };
  }
  return {
    title: "Submit a story",
    description: "Send a tip about a kind, non-political story. Published stories are checked against the original report.",
    alternates: pageAlternates("/submit"),
  };
}

export default async function SubmitPage({ searchParams }: Props) {
  const mode = ambassadorFormMode((await searchParams).type);

  return (
    <div className="page-block">
      <div className="wrap page-hero">
        {mode === "ambassador-signup" ? (
          <>
            <p className="kicker">Kindness Ambassadors</p>
            <h1>Kindness Ambassadors class signup.</h1>
            <p className="lede">
              A teacher or group leader sends one note for the class. We ask for a first name or the group name, the school or group, city, state or country, grade range, and an email. We do not ask for student names or photos of children. Do not send them.
            </p>
            <p className="lede">
              This is the same tip form as every other note. It is emailed to {siteConfig.contactEmail}.{" "}
              <Link href={AMBASSADORS_PATH}>Read how the program works.</Link>
            </p>
          </>
        ) : mode === "ambassador-report" ? (
          <>
            <p className="kicker">Kindness Ambassadors</p>
            <h1>Tell us how it went.</h1>
            <p className="lede">
              Ambassador classes can send what they did this week. Name the class or group, not a student. Do not include photos of children.
            </p>
            <p className="lede">
              The note uses the same tip form as every other story, and it is emailed to {siteConfig.contactEmail}.
            </p>
          </>
        ) : (
          <>
            <p className="kicker">Tips</p>
            <h1>Know a good story?</h1>
            <p className="lede">
              Tell us about a neighbor, a teacher, a clinic, or a town doing something kind. Include a source if you have one. A story we publish is checked against its original report, and we link that source.
            </p>
            <p className="lede">
              Have an update on a story we covered? Include the link to that story and what happened next.
            </p>
          </>
        )}
      </div>
      <div className="wrap" style={{ paddingTop: 24, maxWidth: 860 }}>
        <SubmitForm mode={mode} />
      </div>
    </div>
  );
}
