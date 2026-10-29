"use client";

export function PrintButton({ label = "Print this story", pdfLabel }: { label?: string; pdfLabel?: string }) {
  return (
    <>
      <button type="button" className="btn btn-ink no-print" onClick={() => window.print()}>
        {label}
      </button>
      {pdfLabel ? (
        <button type="button" className="btn btn-outline no-print" onClick={() => window.print()} aria-describedby="pdf-hint">
          {pdfLabel}
        </button>
      ) : null}
    </>
  );
}
