import { CopyLink } from "./copy-link";
import type { ShareLine } from "@/lib/partner-kit";

export function ShareLines({ lines }: { lines: ShareLine[] }) {
  return (
    <ul className="share-lines">
      {lines.map((line) => (
        <li key={line.id}>
          <p>{line.text}</p>
          {line.note ? <p className="share-note">{line.note}</p> : null}
          <CopyLink value={line.text} label={line.label} />
        </li>
      ))}
    </ul>
  );
}
