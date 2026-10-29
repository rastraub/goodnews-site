import { ImageResponse } from "next/og";
import { SunMark } from "./brand";
import { BADGE_PNG_SCALE, badgeTheme, badgeVariant } from "./badges";
import { ogFonts } from "./og";
import { siteConfig } from "@/site.config";

function horizontalBadge(theme: ReturnType<typeof badgeTheme>, width: number, height: number) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        background: theme.bg,
        borderRadius: 28,
        border: `4px solid ${theme.stroke}`,
        padding: "0 28px",
      }}
    >
      <SunMark size={96} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 18,
            letterSpacing: 2.4,
            color: theme.kicker,
            fontWeight: 600,
          }}
        >
          FEATURED ON
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontFamily: "Fraunces",
            fontSize: 52,
            color: theme.name,
            fontWeight: 600,
          }}
        >
          {siteConfig.name}
        </div>
      </div>
    </div>
  );
}

function squareBadge(theme: ReturnType<typeof badgeTheme>, width: number, height: number) {
  const nameSize = siteConfig.name.length > 12 ? 40 : 52;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: theme.bg,
        borderRadius: 44,
        border: `4px solid ${theme.stroke}`,
      }}
    >
      <SunMark size={120} />
      <div
        style={{
          display: "flex",
          marginTop: 26,
          fontFamily: "Inter",
          fontSize: 18,
          letterSpacing: 2.8,
          color: theme.kicker,
          fontWeight: 600,
        }}
      >
        FEATURED ON
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontFamily: "Fraunces",
          fontSize: nameSize,
          color: theme.name,
          fontWeight: 600,
        }}
      >
        {siteConfig.name}
      </div>
    </div>
  );
}

export function badgePng(id: string) {
  const variant = badgeVariant(id);
  if (!variant) throw new Error(`Unknown badge ${id}`);
  const theme = badgeTheme(variant.theme);
  const width = variant.width * BADGE_PNG_SCALE;
  const height = variant.height * BADGE_PNG_SCALE;
  const element = variant.shape === "horizontal" ? horizontalBadge(theme, width, height) : squareBadge(theme, width, height);
  return new ImageResponse(element, { width, height, fonts: ogFonts() });
}
