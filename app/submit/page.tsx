import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit a story",
  description: "Send a tip about a kind, verified, non-political story. An editor checks every one.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Tips</p>
        <h1>Know a good story?</h1>
        <p className="lede">
          Tell us about a neighbor, a teacher, a clinic, or a town doing something kind. Include a source if you have one. We read every tip and publish only what we can verify.
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 24, maxWidth: 860 }}>
        <SubmitForm />
      </div>
    </div>
  );
}
