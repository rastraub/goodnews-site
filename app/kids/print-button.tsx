"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-ink no-print" onClick={() => window.print()}>
      Print this story
    </button>
  );
}
