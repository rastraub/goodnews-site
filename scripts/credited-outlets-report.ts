/**
 * CSV of newsrooms credited in published stories, for outreach notes.
 * Drafts are left out. The list matches /sources.
 *
 *   npm run credited-outlets-report
 *   npm run credited-outlets-report -- outlets.csv
 *   npm run credited-outlets-report -- --out outlets.csv
 */
import fs from "fs";
import path from "path";
import { formatOutletCsv, outletReportRows } from "../lib/outlets";

function outputPath(argv: string[]): string | undefined {
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out" || arg === "-o") {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) throw new Error("Pass a file path after --out.");
      return next;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option ${arg}.`);
    return arg;
  }
  return undefined;
}

const rows = outletReportRows();
const csv = formatOutletCsv(rows);
const dest = outputPath(process.argv);

if (!dest) {
  process.stdout.write(csv);
} else {
  const file = path.resolve(dest);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, csv);
  console.error(`Wrote ${rows.length} newsrooms to ${file}`);
}
