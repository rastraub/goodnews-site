"use client";

export default function SpanishErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Error</p>
        <h1>Algo salió mal.</h1>
        <p className="lede">Esta página tuvo un problema. El resto del sitio sigue bien.</p>
        <p style={{ marginTop: 18 }}>
          <button className="btn btn-ink" type="button" onClick={() => reset()}>
            Intentar de nuevo
          </button>
        </p>
      </div>
    </div>
  );
}
