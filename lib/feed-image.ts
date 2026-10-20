import fs from "fs";
import path from "path";
import { largeJpegPath } from "./images";

export type ServedImage = {
  path: string;
  width: number;
  height: number;
  mime: "image/jpeg" | "image/webp";
  bytes?: number;
  /** True when a JPEG at least 1200px wide, with a short side of at least 500px, is on disk. */
  large: boolean;
};

const cache = new Map<string, ServedImage>();

export function storyFeedImage(webpPath: string): ServedImage {
  const cached = cache.get(webpPath);
  if (cached) return cached;
  const jpegPath = largeJpegPath(webpPath);
  const large = readServed(jpegPath, "image/jpeg");
  const served =
    large && large.width >= 1200 && Math.min(large.width, large.height) >= 500
      ? { ...large, large: true }
      : { ...readServed(webpPath, "image/webp"), large: false };
  cache.set(webpPath, served);
  return served;
}

export function openGraphImage(story: { image: string; imageAlt: string }) {
  const served = storyFeedImage(story.image);
  return {
    url: served.path,
    alt: story.imageAlt,
    type: served.mime,
    ...(served.width > 0 && served.height > 0 ? { width: served.width, height: served.height } : {}),
  };
}

export function feedImageReport(paths: string[]) {
  let large = 0;
  let fallback = 0;
  for (const imagePath of paths) {
    if (storyFeedImage(imagePath).large) large += 1;
    else fallback += 1;
  }
  return { large, fallback };
}

function readServed(publicPath: string, mime: ServedImage["mime"]): Omit<ServedImage, "large"> {
  const absolute = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  if (!fs.existsSync(absolute)) return { path: publicPath, width: 0, height: 0, mime };
  const bytes = fs.statSync(absolute).size;
  const size = readImageSize(fs.readFileSync(absolute));
  return { path: publicPath, width: size?.width ?? 0, height: size?.height ?? 0, mime, bytes };
}

export function readImageSize(buf: Buffer): { width: number; height: number } | undefined {
  if (buf.length >= 24 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return readWebpSize(buf);
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return readJpegSize(buf);
  return undefined;
}

function readWebpSize(buf: Buffer): { width: number; height: number } | undefined {
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 " && buf.length >= 30) {
    const start = 20;
    if (buf[start + 3] !== 0x9d || buf[start + 4] !== 0x01 || buf[start + 5] !== 0x2a) return undefined;
    return { width: buf.readUInt16LE(start + 6) & 0x3fff, height: buf.readUInt16LE(start + 8) & 0x3fff };
  }
  if (chunk === "VP8L" && buf.length >= 25 && buf[20] === 0x2f) {
    const b1 = buf[21] ?? 0;
    const b2 = buf[22] ?? 0;
    const b3 = buf[23] ?? 0;
    const b4 = buf[24] ?? 0;
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X" && buf.length >= 30) {
    return {
      width: 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)),
      height: 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16)),
    };
  }
  return undefined;
}

function readJpegSize(buf: Buffer): { width: number; height: number } | undefined {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return undefined;
    const marker = buf[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) return undefined;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return undefined;
}
