import { ImageResponse } from "next/og";
import { SunMark } from "./brand";
import { ogFonts } from "./og";
import { SIGNATURE_HEIGHT, SIGNATURE_WIDTH } from "./signature-badge";
import { siteConfig } from "@/site.config";

const SCALE = 2;

function nameSize(name: string): number {
  if (name.length > 16) return 22;
  if (name.length > 12) return 26;
  if (name.length > 9) return 28;
  return 32;
}

export function signaturePng() {
  const width = SIGNATURE_WIDTH * SCALE;
  const height = SIGNATURE_HEIGHT * SCALE;
  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          background: "#FFFBF4",
          borderRadius: 16,
          border: "2px solid #E4D3B0",
          padding: "0 12px",
        }}
      >
        <SunMark size={56} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 12 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 16,
              letterSpacing: 0.8,
              color: "#8F5E00",
              fontWeight: 600,
            }}
          >
            I READ GOOD NEWS ON
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 2,
              fontFamily: "Fraunces",
              fontSize: nameSize(siteConfig.name),
              color: "#1C2733",
              fontWeight: 600,
            }}
          >
            {siteConfig.name}
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: ogFonts() },
  );
}
