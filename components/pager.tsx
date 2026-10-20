import Link from "next/link";
import { pagePath } from "@/lib/paging";

export function Pager({ base, page, pages }: { base: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const prev = page > 1 ? pagePath(base, page - 1) : null;
  const next = page < pages ? pagePath(base, page + 1) : null;
  return (
    <nav className="pager" aria-label="Pagination">
      {prev ? <Link href={prev}>Previous</Link> : <span className="muted">Previous</span>}
      <span>
        Page {page} of {pages}
      </span>
      {next ? <Link href={next}>Next</Link> : <span className="muted">Next</span>}
    </nav>
  );
}
