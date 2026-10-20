import type { Metadata } from "next";
import { KidsBrowse, kidsPageMetadata } from "./browse";

export const metadata: Metadata = kidsPageMetadata(1);

export default function KidsPage() {
  return <KidsBrowse page={1} />;
}
