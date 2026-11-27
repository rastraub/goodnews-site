import fs from "fs";
import {
  INDEXNOW_LOOKBACK_HOURS,
  indexNowHost,
  indexNowKeyFileMatches,
  recentIndexNowUrls,
  siteUrlForIndexNow,
  submitIndexNow,
} from "../lib/indexnow-submit";

/**
 * Manual IndexNow backfill. Does not run during the build.
 *
 *   npx tsx scripts/indexnow-backfill.ts --dry-run --recent
 *   npx tsx scripts/indexnow-backfill.ts --dry-run https://<host>/story/<slug>
 *   npx tsx scripts/indexnow-backfill.ts --file urls.txt
 *   npx tsx scripts/indexnow-backfill.ts https://<host>/story/<slug>
 *
 * --dry-run or DRY_RUN=1 prints the JSON body and does not call IndexNow.
 * Without that flag the script POSTs to https://api.indexnow.org/indexnow.
 * Every URL must be https on the production host.
 */

function usage(): string {
  const host = indexNowHost();
  const example = `https://${host}/story/<slug>`;
  return [
    "Usage:",
    "  npx tsx scripts/indexnow-backfill.ts --dry-run --recent",
    `  npx tsx scripts/indexnow-backfill.ts --dry-run ${example}`,
    "  npx tsx scripts/indexnow-backfill.ts --file urls.txt",
    `  npx tsx scripts/indexnow-backfill.ts ${example}`,
    "",
    "--dry-run or DRY_RUN=1 prints the payload and does not send it.",
    `--recent adds stories from the last ${INDEXNOW_LOOKBACK_HOURS} hours. URLs must be https://${host}.`,
    "One URL per line in --file. Blank lines and # comments are ignored.",
  ].join("\n");
}

function readFileUrls(file: string): string[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const recent = args.includes("--recent");
  const fileFlag = args.indexOf("--file");
  const file = fileFlag >= 0 ? args[fileFlag + 1] : undefined;
  if (fileFlag >= 0 && (!file || file.startsWith("--"))) {
    console.error("Pass a path after --file.");
    process.exitCode = 1;
    return;
  }

  const positional = args.filter((arg, index) => {
    if (arg.startsWith("--")) return false;
    if (fileFlag >= 0 && index === fileFlag + 1) return false;
    return true;
  });

  const raw = [...(file ? readFileUrls(file) : []), ...positional];
  const accepted: string[] = [];
  for (const value of raw) {
    const url = siteUrlForIndexNow(value);
    if (!url) {
      console.warn(`Skipping ${value}. Use an https URL on ${indexNowHost()}.`);
      continue;
    }
    accepted.push(url);
  }

  let urlList = accepted;
  if (recent) {
    const found = recentIndexNowUrls();
    console.log(`Stories in the last ${INDEXNOW_LOOKBACK_HOURS} hours (${found.stories.length}):`);
    for (const story of found.stories) console.log(`${story.date}  ${story.slug}`);
    urlList = [...found.urls, ...accepted];
  }

  if (!recent && accepted.length === 0) {
    console.error("No URLs to submit. Pass --recent, a URL, or --file.");
    process.exitCode = 1;
    return;
  }

  const result = await submitIndexNow(urlList, { dryRun });
  const payload = result.payloads.length === 1 ? result.payloads[0] : result.payloads;
  if (dryRun) {
    const keyFile = indexNowKeyFileMatches();
    if (keyFile === false) console.warn("public/<key>.txt does not match the key constant.");
    console.log(JSON.stringify(payload, null, 2));
    console.log(`Dry run: ${result.count} URLs in ${result.payloads.length} request(s). Nothing was sent.`);
    return;
  }
  if (result.skipped && result.count === 0) {
    console.log("No URLs to submit.");
    return;
  }
  if (!result.ok) {
    console.error(result.error ?? "IndexNow ping failed.");
    process.exitCode = 1;
    return;
  }
  console.log(`Submitted ${result.count} URLs. IndexNow status ${result.status}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
