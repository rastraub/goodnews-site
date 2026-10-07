import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">404</p>
        <h1>That page wandered off.</h1>
        <p className="lede">The story may have moved, or the link is off by a letter.</p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/">
            Back to today
          </Link>
        </p>
      </div>
    </div>
  );
}
