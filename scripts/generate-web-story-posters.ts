/**
 * Crop a 3:4 portrait poster from each day's lead photo.
 * The morning job does not run this. `npm run build` does.
 *
 *   npm run web-story-posters
 *   npm run web-story-posters -- --force
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { readImageSize } from "../lib/feed-image";
import { largeJpegPath } from "../lib/images";
import { listWebStories, WEB_STORY_POSTER, WEB_STORY_POSTER_MIN, webStoryPosterPath } from "../lib/web-stories";

const DIR = path.join(process.cwd(), "public", "images", "web-stories");
const force = process.argv.includes("--force");

sharp.cache(false);

function absPublic(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function scaleNeeded(width: number, height: number): number {
  return Math.max(WEB_STORY_POSTER.width / width, WEB_STORY_POSTER.height / height);
}

function chooseSource(imagePath: string): string {
  const webp = absPublic(imagePath);
  const jpeg = absPublic(largeJpegPath(imagePath));
  if (!fs.existsSync(jpeg)) return webp;
  const webpSize = readImageSize(fs.readFileSync(webp));
  const jpegSize = readImageSize(fs.readFileSync(jpeg));
  if (!webpSize) return jpeg;
  if (!jpegSize) return webp;
  return scaleNeeded(jpegSize.width, jpegSize.height) <= scaleNeeded(webpSize.width, webpSize.height) ? jpeg : webp;
}

async function encode(source: string, credit: string, license: string): Promise<Buffer> {
  let quality = 74;
  let buffer: Buffer | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pipeline = () =>
      sharp(source, { failOn: "none" })
        .rotate()
        .resize(WEB_STORY_POSTER.width, WEB_STORY_POSTER.height, { fit: "cover", position: "attention" })
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" });
    try {
      buffer = await pipeline()
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
      buffer = await pipeline().toBuffer();
    }
    if (buffer.length > 480_000 && quality > 58) {
      quality -= 6;
      continue;
    }
    break;
  }
  if (!buffer) throw new Error("encode failed");
  return buffer;
}

function posterOk(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  const size = readImageSize(fs.readFileSync(file));
  return size?.width === WEB_STORY_POSTER.width && size.height === WEB_STORY_POSTER.height;
}

async function main() {
  const editions = listWebStories();
  fs.mkdirSync(DIR, { recursive: true });
  const expected = new Set<string>();
  let wrote = 0;
  let kept = 0;

  for (const edition of editions) {
    const lead = edition.stories[0];
    if (!lead) throw new Error(`No lead story for ${edition.date}`);
    const rel = webStoryPosterPath(edition.date, lead.image);
    if (rel !== edition.posterPath) {
      throw new Error(`Poster path for ${edition.date} does not match the story document.`);
    }
    const file = absPublic(rel);
    expected.add(path.basename(file));
    if (!force && posterOk(file)) {
      kept += 1;
      continue;
    }
    const buffer = await encode(chooseSource(lead.image), lead.imageCredit, lead.imageLicense);
    const size = readImageSize(buffer);
    const ratio = size ? size.width / size.height : 0;
    if (
      !size ||
      size.width < WEB_STORY_POSTER_MIN.width ||
      size.height < WEB_STORY_POSTER_MIN.height ||
      Math.abs(ratio - 3 / 4) > 0.01
    ) {
      throw new Error(
        `Poster for ${edition.date} is ${size?.width ?? 0}x${size?.height ?? 0}. It needs a 3:4 crop at least ${WEB_STORY_POSTER_MIN.width}x${WEB_STORY_POSTER_MIN.height}.`,
      );
    }
    fs.writeFileSync(file, buffer);
    wrote += 1;
  }

  for (const name of fs.readdirSync(DIR)) {
    if (!expected.has(name)) fs.unlinkSync(path.join(DIR, name));
  }

  console.log(`Web story posters: ${wrote} written, ${kept} kept, ${expected.size} dates.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
