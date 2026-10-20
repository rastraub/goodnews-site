import { ImageResponse } from "next/og";
import { SunMark } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#FFFBF4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SunMark size={140} />
      </div>
    ),
    { ...size },
  );
}
