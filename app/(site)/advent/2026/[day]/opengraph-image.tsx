import { ImageResponse } from "next/og";
import { adventDoor, adventOgLines, adventToday, getAdventCalendar, parseAdventDay } from "@/lib/advent";
import { OgFrame, ogFonts, ogSize } from "@/lib/og";

export const alt = "December Advent of Good News";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const number = parseAdventDay(day);
  const door = number ? adventDoor(getAdventCalendar(adventToday()), number) : undefined;
  const lines = door
    ? adventOgLines(door)
    : { kicker: "Advent of Good News", title: "December door", footer: "A real story and a free kind act" };
  return new ImageResponse(<OgFrame kicker={lines.kicker} title={lines.title} footer={lines.footer} />, {
    ...size,
    fonts: ogFonts(),
  });
}
