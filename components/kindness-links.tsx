import Link from "next/link";
import { KINDNESS_INDEX_PATH, thisWeeksChallenge } from "@/lib/kindness";

/** A short jump from the classroom pages to this week's challenge. */
export function KindnessLinks() {
  const current = thisWeeksChallenge();
  return (
    <div className="classroom-box">
      <h2>Kindness Challenge</h2>
      <p>
        One small, free act each week for a class or a family. It stays with people a child already knows, and it starts from a real story.
      </p>
      <p className="link-pills">
        {current ? <Link href={current.path}>This week&apos;s challenge</Link> : null}
        <Link href={KINDNESS_INDEX_PATH}>All challenges</Link>
      </p>
    </div>
  );
}
