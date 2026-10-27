"use client";

export function PrintButton({ label = "Print this story" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-ink no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
