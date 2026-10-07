export function VerifiedBadge({ source, withSourceWord = false }: { source: string; withSourceWord?: boolean }) {
  return (
    <span className="verify">
      <svg className="ico" aria-hidden="true">
        <use href="#i-check" />
      </svg>
      Verified <span>· {withSourceWord ? `Source: ${source}` : source}</span>
    </span>
  );
}
