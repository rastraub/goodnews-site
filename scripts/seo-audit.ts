/**
 * SEO and site-health audit.
 * Set production mode before the audit module loads so story and hub caches stay on.
 * Otherwise every metadata call would re-read the story files.
 */
Reflect.set(process.env, "NODE_ENV", "production");

async function main() {
  const { runSeoAudit, formatSeoReport } = await import("../lib/seo-audit");
  const outFlag = process.argv.indexOf("--out");
  const out = outFlag >= 0 ? process.argv[outFlag + 1] : "seo-audit-report.json";
  if (!out || out.startsWith("--")) {
    console.error("Pass a file path after --out.");
    process.exit(1);
  }
  const started = Date.now();
  const report = await runSeoAudit((message) => {
    process.stderr.write(`${message}\n`);
  });
  const fs = await import("fs");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(formatSeoReport(report));
  process.stdout.write(`\nWrote ${out} in ${((Date.now() - started) / 1000).toFixed(1)}s.\n`);
  process.exit(report.errorCount > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
