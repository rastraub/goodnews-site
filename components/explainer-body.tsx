import Link from "next/link";

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;

function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const href = match[2] ?? "";
    const label = match[1] ?? "";
    if (href.startsWith("/")) {
      nodes.push(
        <Link key={index} href={href}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      );
    }
    last = index + match[0].length;
  }
  nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export function ExplainerBody({ markdown }: { markdown: string }) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return <h2 key={index}>{block.slice(3).trim()}</h2>;
        }
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line) => (
                <li key={line}>
                  <RichText text={line.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            <RichText text={lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}
