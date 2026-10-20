import type { Metadata } from "next";
import { StoriesBrowse, storiesPageMetadata } from "./browse";

export const metadata: Metadata = storiesPageMetadata(1);

export default function StoriesPage() {
  return <StoriesBrowse page={1} />;
}
