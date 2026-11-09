import { ImageResponse } from "next/og";
import { SunMark } from "@/lib/brand";
import { siteConfig } from "@/site.config";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: siteConfig.theme.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SunMark size={150} />
      </div>
    ),
    { ...size },
  );
}
