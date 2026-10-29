"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Error</p>
        <h1>Something went wrong.</h1>
        <p className="lede">This page hit a snag. The rest of the site is fine.</p>
        <p style={{ marginTop: 18 }}>
          <button className="btn btn-ink" type="button" onClick={() => reset()}>
            Try again
          </button>
        </p>
      </div>
    </div>
  );
}
