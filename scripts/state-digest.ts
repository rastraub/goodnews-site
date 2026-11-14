/**
 * Write a weekly state digest and a coverage report as local files.
 * Does not send mail and does not call an email vendor.
 *
 * Usage: npm run newsletter:state-digest -- --state CO --week YYYY-MM-DD
 */
import fs from "fs";
import path from "path";
import { buildStateDigest, DIGEST_MIN_STORIES, parseDigestArgs } from "../lib/state-digest";
import { getPublishedStories } from "../lib/stories";

const parsed = parseDigestArgs(process.argv.slice(2));
if (!parsed.ok) {
  console.error(parsed.error);
  process.exit(1);
}

const digest = buildStateDigest(getPublishedStories(), parsed.state, parsed.week);
const dir = path.join(process.cwd(), "output", "state-digests", digest.start);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${digest.fileSlug}.md`), digest.markdown);
fs.writeFileSync(path.join(dir, `${digest.fileSlug}.html`), digest.html);
fs.writeFileSync(path.join(dir, "coverage.md"), digest.coverageMarkdown);
fs.writeFileSync(path.join(dir, "coverage.html"), digest.coverageHtml);

const enough = digest.coverage.filter((row) => row.enough).length;
console.log(
  `Wrote ${dir} (${digest.stories.length} ${digest.stories.length === 1 ? "story" : "stories"} for ${digest.name}; ${enough} states with ${DIGEST_MIN_STORIES}+).`,
);
