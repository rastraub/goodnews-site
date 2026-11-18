import type { WordPlacement } from "@/lib/word-search";

export function WordGrid({
  grid,
  marked,
  label,
}: {
  grid: string[][];
  marked?: ReadonlySet<string>;
  label: string;
}) {
  if (!grid.length) return null;
  return (
    <div className="word-grid-wrap">
      <table className="word-grid">
        <caption className="sr">{label}</caption>
        <tbody>
          {grid.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((letter, colIndex) => {
                const hit = marked?.has(`${rowIndex},${colIndex}`);
                return (
                  <td key={colIndex} className={hit ? "is-answer" : undefined}>
                    {letter}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function answerKeyList(placements: readonly WordPlacement[]) {
  return placements
    .slice()
    .sort((a, b) => a.letters.localeCompare(b.letters) || a.row - b.row || a.col - b.col);
}
