import { ImageResponse } from "next/og";
import { ogFonts } from "./og";
import { siteConfig } from "@/site.config";

export const SQUARE_LOGO = { path: "/brand/tazzora-square-1024.png", width: 1024, height: 1024 } as const;
export const SQUARE_LOGO_TRANSPARENT = {
  path: "/brand/tazzora-square-1024-transparent.png",
  width: 1024,
  height: 1024,
} as const;
export const SMARTNEWS_LOGO = { path: "/brand/smartnews-logo-700x100.png", width: 700, height: 100 } as const;
export const SMARTNEWS_LOGO_DARK = {
  path: "/brand/smartnews-logo-dark-700x100.png",
  width: 700,
  height: 100,
} as const;

export const FAVICON_SIZES = [48, 96, 192, 512] as const;

export function faviconPath(size: (typeof FAVICON_SIZES)[number]) {
  return `/brand/favicon-${size}.png` as const;
}

const INK = "#1C2733";
const CREAM = "#FFFBF4";
const PAPER = "#FFF1D2";
const GOLD = "#F3B23C";

export function SunMark({ size }: { size: number }) {
  const inner = Math.round(size * 0.46);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: PAPER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: inner, height: inner, borderRadius: inner / 2, background: GOLD }} />
    </div>
  );
}

export type BrandKind =
  | "square"
  | "square-transparent"
  | "smartnews"
  | "smartnews-dark"
  | "favicon-48"
  | "favicon-96"
  | "favicon-192"
  | "favicon-512";

export function brandImage(kind: BrandKind) {
  if (kind === "square" || kind === "square-transparent") {
    const transparent = kind === "square-transparent";
    return new ImageResponse(
      (
        <div
          style={{
            width: 1024,
            height: 1024,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: transparent ? "transparent" : CREAM,
          }}
        >
          <SunMark size={420} />
          <div
            style={{
              marginTop: 48,
              fontFamily: "Fraunces",
              fontSize: 112,
              fontWeight: 600,
              color: INK,
              display: "flex",
            }}
          >
            {siteConfig.name}
          </div>
        </div>
      ),
      { width: 1024, height: 1024, fonts: ogFonts() },
    );
  }

  if (kind === "smartnews" || kind === "smartnews-dark") {
    const dark = kind === "smartnews-dark";
    return new ImageResponse(
      (
        <div
          style={{
            width: 700,
            height: 100,
            display: "flex",
            alignItems: "center",
            background: "transparent",
            paddingLeft: 8,
          }}
        >
          <SunMark size={72} />
          <div
            style={{
              marginLeft: 18,
              fontFamily: "Fraunces",
              fontSize: 52,
              fontWeight: 600,
              color: dark ? CREAM : INK,
              display: "flex",
            }}
          >
            {siteConfig.name}
          </div>
        </div>
      ),
      { width: 700, height: 100, fonts: ogFonts() },
    );
  }

  const size = Number(kind.slice("favicon-".length));
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SunMark size={Math.round(size * 0.78)} />
      </div>
    ),
    { width: size, height: size },
  );
}
