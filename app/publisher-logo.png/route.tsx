import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og";
import { PUBLISHER_LOGO } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const revalidate = 86400;

export function GET() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#FFFBF4",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "#FFF1D2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#F3B23C" }} />
        </div>
        <div style={{ display: "flex", fontSize: 28, fontFamily: "Fraunces", color: "#1C2733", fontWeight: 600 }}>
          {siteConfig.name}
        </div>
      </div>
    ),
    {
      width: PUBLISHER_LOGO.width,
      height: PUBLISHER_LOGO.height,
      fonts: ogFonts(),
    },
  );
  image.headers.set("Cache-Control", "public, max-age=86400");
  return image;
}
