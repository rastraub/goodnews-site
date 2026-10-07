import fs from "fs";
import path from "path";
import { siteConfig } from "@/site.config";

export const ogSize = { width: 1200, height: 630 };

let fontCache: { fraunces: Buffer; inter: Buffer } | null = null;

export function ogFonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    fontCache = {
      fraunces: fs.readFileSync(path.join(dir, "Fraunces-600.ttf")),
      inter: fs.readFileSync(path.join(dir, "Inter-600.ttf")),
    };
  }
  return [
    { name: "Fraunces", data: fontCache.fraunces, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: fontCache.inter, weight: 600 as const, style: "normal" as const },
  ];
}

export function OgFrame({
  kicker,
  title,
  footer,
}: {
  kicker: string;
  title: string;
  footer?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#FFFBF4",
        padding: "64px 72px",
        color: "#1C2733",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "#FFF1D2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#F3B23C" }} />
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>{siteConfig.name}</div>
      </div>
      <div
        style={{
          marginTop: 48,
          color: "#C98612",
          fontSize: 22,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: "Fraunces",
          fontSize: title.length > 80 ? 54 : 64,
          lineHeight: 1.08,
          letterSpacing: -1,
          fontWeight: 600,
          display: "flex",
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 24, color: "#4A5563" }}>
        <div style={{ display: "flex" }}>{footer || "Verified · linked to the original source"}</div>
        <div style={{ display: "flex", color: "#2E8B66", fontWeight: 600 }}>No politics. Ever.</div>
      </div>
    </div>
  );
}
