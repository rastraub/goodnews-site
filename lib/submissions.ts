import fs from "fs";
import path from "path";
import { sendStoryTipEmail } from "@/lib/smtp";
import { prepareStoryTip, storyTipBodies, storyTipSubject, type StoryTip } from "@/lib/tip-mail";

export type { StoryTip };

/**
 * Reader-tip handler.
 *
 * Every tip is logged. When SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS
 * are set, the tip is emailed to the site mailbox. Missing SMTP settings are
 * not an error: the tip is still logged and, when SUBMISSION_WEBHOOK_URL is
 * set, posted there. A writable disk also gets a JSON line in
 * data/submissions/inbox.jsonl. A database is still a later step.
 */
export async function handleStorySubmission(tip: StoryTip): Promise<void> {
  const clean = prepareStoryTip(tip);
  const line = JSON.stringify(clean);
  console.log(`[submit] ${line}`);

  const { text, html } = storyTipBodies(clean);
  await sendStoryTipEmail({
    subject: storyTipSubject(clean.summary),
    text,
    html,
    replyTo: clean.email,
  });

  const webhook = (process.env.SUBMISSION_WEBHOOK_URL || "").trim();
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
    });
    if (!response.ok) {
      throw new Error(`Submission webhook returned ${response.status}`);
    }
  }

  try {
    const dir = path.join(process.cwd(), "data", "submissions");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "inbox.jsonl"), `${line}\n`, "utf8");
  } catch (error) {
    console.warn("[submit] could not write data/submissions/inbox.jsonl", error);
  }
}
