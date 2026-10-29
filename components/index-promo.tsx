import Link from "next/link";
import { latestIndex } from "@/lib/good-news-index";

export function IndexPromo() {
  const edition = latestIndex();
  if (!edition) return null;
  const count = `${edition.storyCount} ${edition.storyCount === 1 ? "story" : "stories"}`;
  return (
    <p className="index-promo">
      <Link href={edition.path}>
        Good News Index{edition.inProgress ? ", month to date" : ""}: {edition.label}. {count}.
      </Link>
    </p>
  );
}
