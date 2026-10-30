import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit a story",
  description: "Send a tip about a kind, non-political story. Published stories are checked against the original report.",
  alternates: pageAlternates("/submit"),
};

export default function SubmitPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Tips</p>
        <h1>Know a good story?</h1>
        <p className="lede">
          Tell us about a neighbor, a teacher, a clinic, or a town doing something kind. Include a source if you have one. A story we publish is checked against its original report, and we link that source.
        </p>
        <p className="lede">
          Have an update on a story we covered? Include the link to that story and what happened next.
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 24, maxWidth: 860 }}>
        <SubmitForm />
      </div>
    </div>
  );
}
