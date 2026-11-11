import Link from "next/link";
import { AMBASSADORS_PATH } from "@/lib/ambassador-tip";
import { KINDNESS_INDEX_PATH, thisWeeksChallenge } from "@/lib/kindness";
import { STARTERS_INDEX_PATH } from "@/lib/starter-path";

/** A short jump from the classroom pages to this week's challenge. */
export function KindnessLinks() {
  const current = thisWeeksChallenge();
  return (
    <div className="classroom-box">
      <h2>Kindness Challenge</h2>
      <p>
        One small, free act each week for a class or a family. It stays with people a child already knows, and it starts from a real story.
      </p>
      <p>
        <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link> is for a class or student group that keeps the weekly act going. It is free, and it does not ask for student names or photos of children.
      </p>
      <p className="link-pills">
        {current ? <Link href={current.path}>This week&apos;s challenge</Link> : null}
        <Link href={KINDNESS_INDEX_PATH}>All challenges</Link>
        <Link href={STARTERS_INDEX_PATH}>Good News Starters</Link>
        <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
      </p>
    </div>
  );
}
