import fs from "fs";
import path from "path";

export type StoryTip = {
  name: string;
  email: string;
  city: string;
  state: string;
  summary: string;
  sourceUrl?: string;
  receivedAt: string;
};

/**
 * Pluggable reader-tip handler.
 *
 * TODO(production): persist tips in a database so they survive serverless
 * isolates and deploys. Until then we append JSON lines when the filesystem
 * is writable and, if SUBMISSION_WEBHOOK_URL is set, POST the same payload
 * there. Every tip is also logged.
 */
export async function handleStorySubmission(tip: StoryTip): Promise<void> {
  const line = JSON.stringify(tip);
  console.log(`[submit] ${line}`);

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
