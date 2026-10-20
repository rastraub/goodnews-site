/**
 * Build the large JPEG each story prefers in feeds, og:image, and NewsArticle.
 * Source pixels come from the Wikimedia file already named in imageCreditUrl.
 * A photo that cannot reach 1200px wide without stretching more than 15% is skipped.
 * The WebP on the page is left alone. A missing JPEG does not fail the site build.
 *
 *   npm run feed-images
 *   npm run feed-images -- --force
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { readImageSize } from "../lib/feed-image";
import { largeJpegPath } from "../lib/images";
import { getPublishedStories } from "../lib/stories";
import { siteConfig } from "../site.config";

const USER_AGENT = `${siteConfig.name}FeedImages/1.0 (${siteConfig.url}; ${siteConfig.contactEmail})`;
const TARGET_WIDTH = 1600;
const MIN_WIDTH = 1200;
const MIN_SHORT = 500;
const MAX_UPSCALE = 1.15;
const CONCURRENCY = 2;

type Job = {
  slug: string;
  creditUrl: string;
  credit: string;
  license: string;
  outFile: string;
};

type Outcome = { slug: string; status: "wrote" | "kept" | "fallback"; detail: string; bytes?: number; width?: number; height?: number };

const force = process.argv.includes("--force");
sharp.cache(false);

function even(n: number) {
  const rounded = Math.floor(n);
  return Math.max(2, rounded - (rounded % 2));
}

function chooseRatio(aspect: number) {
  const wide = 16 / 9;
  const standard = 4 / 3;
  const loss = (target: number) => (aspect > target ? 1 - target / aspect : 1 - aspect / target);
  return loss(wide) <= loss(standard) ? wide : standard;
}

export function outputBox(srcW: number, srcH: number): { width: number; height: number } | undefined {
  if (srcW < 2 || srcH < 2) return undefined;
  const ratio = chooseRatio(srcW / srcH);
  const width = even(Math.min(TARGET_WIDTH, MAX_UPSCALE * Math.min(srcW, ratio * srcH)));
  if (width < MIN_WIDTH) return undefined;
  const height = even(width / ratio);
  const scale = Math.max(width / srcW, height / srcH);
  if (scale > MAX_UPSCALE + 0.02) return undefined;
  if (Math.min(width, height) < MIN_SHORT) return undefined;
  return { width, height };
}

function fileTitle(creditUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(creditUrl);
  } catch {
    return undefined;
  }
  if (url.hostname !== "commons.wikimedia.org") return undefined;
  const match = url.pathname.match(/\/wiki\/File:(.+)$/);
  if (!match?.[1]) return undefined;
  return `File:${decodeURIComponent(match[1])}`;
}

let nextRequestAt = 0;

async function pace() {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + 350;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
}

async function request(url: string): Promise<Response> {
  let last = "request failed";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await pace();
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        signal: AbortSignal.timeout(45_000),
        redirect: "follow",
      });
      if (response.status === 429 || response.status >= 500) {
        last = `HTTP ${response.status}`;
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      last = error instanceof Error ? error.message : "request failed";
      if (last.startsWith("HTTP ")) throw new Error(last);
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

type SourceInfo = { width: number; height: number; downloadUrl: string; mime: string };

async function queryTitle(title: string): Promise<SourceInfo | undefined> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    redirects: "1",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "2200",
  });
  const response = await request(`https://commons.wikimedia.org/w/api.php?${params}`);
  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, { missing?: string; imageinfo?: { width?: number; height?: number; url?: string; thumburl?: string; mime?: string }[] }>;
    };
  };
  const page = Object.values(payload.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.width || !info.height || !info.url) return undefined;
  const downloadUrl = info.width >= 2400 && info.thumburl ? info.thumburl : info.url;
  return { width: info.width, height: info.height, downloadUrl, mime: info.mime ?? "" };
}

async function lookup(title: string): Promise<SourceInfo> {
  const direct = await queryTitle(title);
  if (direct) return direct;
  // Some credited WebP titles 404. The same Commons photo is the JPEG with that name.
  if (/\.webp$/i.test(title)) {
    const jpeg = await queryTitle(title.replace(/\.webp$/i, ".jpg"));
    if (jpeg) return jpeg;
  }
  throw new Error("Commons has no image info");
}

const RASTER = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff"]);

async function encode(source: Buffer, box: { width: number; height: number }, credit: string, license: string) {
  let quality = 74;
  let buffer: Buffer | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let pipeline = sharp(source, { failOn: "none" })
      .rotate()
      .resize(box.width, box.height, { fit: "cover", position: "attention" })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" });
    try {
      buffer = await pipeline
        .withMetadata({
          exif: {
            IFD0: {
              Copyright: `${credit}. ${license}.`,
              Artist: credit,
              ImageDescription: `${credit}. ${license}.`,
            },
          },
        })
        .toBuffer();
    } catch {
      buffer = await sharp(source, { failOn: "none" })
        .rotate()
        .resize(box.width, box.height, { fit: "cover", position: "attention" })
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
        .toBuffer();
    }
    if (buffer.length > 390_000 && quality > 52) {
      quality -= 7;
      continue;
    }
    if (buffer.length < 190_000 && quality < 88) {
      quality += 5;
      continue;
    }
    break;
  }
  if (!buffer) throw new Error("encode failed");
  return buffer;
}

function existingOk(file: string): { width: number; height: number } | undefined {
  if (force || !fs.existsSync(file)) return undefined;
  const size = readImageSize(fs.readFileSync(file));
  if (!size || size.width < MIN_WIDTH || Math.min(size.width, size.height) < MIN_SHORT) return undefined;
  return size;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function main() {
  const jobs: Job[] = getPublishedStories().map((story) => ({
    slug: story.slug,
    creditUrl: story.imageCreditUrl,
    credit: story.imageCredit,
    license: story.imageLicense,
    outFile: path.join(process.cwd(), "public", largeJpegPath(story.image).replace(/^\//, "")),
  }));
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const list = groups.get(job.creditUrl);
    if (list) list.push(job);
    else groups.set(job.creditUrl, [job]);
  }

  const outcomes: Outcome[] = [];
  const sources = [...groups.values()];
  let done = 0;

  await mapPool(sources, CONCURRENCY, async (group) => {
    const pending = group.filter((job) => !existingOk(job.outFile));
    for (const job of group) {
      const size = existingOk(job.outFile);
      if (size) outcomes.push({ slug: job.slug, status: "kept", detail: "already on disk", width: size.width, height: size.height, bytes: fs.statSync(job.outFile).size });
    }
    if (!pending.length) {
      done += 1;
      return;
    }

    const title = fileTitle(pending[0]!.creditUrl);
    if (!title) {
      for (const job of pending) outcomes.push({ slug: job.slug, status: "fallback", detail: "credit URL is not a Commons file" });
      done += 1;
      return;
    }

    try {
      const info = await lookup(title);
      if (!RASTER.has(info.mime)) {
        for (const job of pending) outcomes.push({ slug: job.slug, status: "fallback", detail: `source type ${info.mime || "unknown"}` });
        done += 1;
        return;
      }
      if (!outputBox(info.width, info.height)) {
        for (const job of pending) {
          outcomes.push({ slug: job.slug, status: "fallback", detail: `original ${info.width}x${info.height} is too small to reach ${MIN_WIDTH}px without stretching` });
        }
        done += 1;
        return;
      }
      const response = await request(info.downloadUrl);
      const source = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(source, { failOn: "none" }).rotate().metadata();
      const box = outputBox(meta.width ?? 0, meta.height ?? 0);
      if (!box) {
        for (const job of pending) {
          outcomes.push({
            slug: job.slug,
            status: "fallback",
            detail: `downloaded ${meta.width ?? 0}x${meta.height ?? 0} is too small to reach ${MIN_WIDTH}px without stretching`,
          });
        }
        done += 1;
        return;
      }
      for (const job of pending) {
        const jpeg = await encode(source, box, job.credit, job.license);
        fs.mkdirSync(path.dirname(job.outFile), { recursive: true });
        fs.writeFileSync(job.outFile, jpeg);
        outcomes.push({ slug: job.slug, status: "wrote", detail: `${box.width}x${box.height}`, bytes: jpeg.length, width: box.width, height: box.height });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "download failed";
      for (const job of pending) outcomes.push({ slug: job.slug, status: "fallback", detail: message });
    }
    done += 1;
    if (done % 20 === 0 || done === sources.length) console.log(`sources ${done}/${sources.length}`);
  });

  const wrote = outcomes.filter((item) => item.status === "wrote");
  const kept = outcomes.filter((item) => item.status === "kept");
  const fallback = outcomes.filter((item) => item.status === "fallback");
  const sizes = [...wrote, ...kept].map((item) => item.bytes ?? 0).filter(Boolean);
  const summary = {
    stories: jobs.length,
    wrote: wrote.length,
    kept: kept.length,
    large: wrote.length + kept.length,
    fallback: fallback.length,
    bytes: sizes.reduce((sum, size) => sum + size, 0),
    minBytes: sizes.length ? Math.min(...sizes) : 0,
    maxBytes: sizes.length ? Math.max(...sizes) : 0,
    reasons: fallback.reduce<Record<string, number>>((map, item) => {
      map[item.detail] = (map[item.detail] ?? 0) + 1;
      return map;
    }, {}),
  };
  const reportPath = path.join("/tmp", "feed-image-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ summary, fallback }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`report ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
