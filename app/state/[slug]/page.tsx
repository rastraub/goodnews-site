import type { Metadata } from "next";
import { StateBrowse, statePageMetadata } from "./browse";
import { STATES } from "@/lib/states";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((state) => ({ slug: state.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return statePageMetadata(slug, 1);
}

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  return <StateBrowse slug={slug} page={1} />;
}
