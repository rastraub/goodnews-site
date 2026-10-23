import { spokenText } from "@/lib/listen-text";

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <a key={index} href={match[2]} rel="noopener noreferrer">
        {match[1]}
      </a>,
    );
    last = index + match[0].length;
  }
  nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export function StoryBody({ markdown }: { markdown: string }) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  let spokenIndex = 0;
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const id = spokenText(block) ? `speak-p-${spokenIndex++}` : undefined;
        return (
          <p key={index} id={id}>
            <RichText text={block} />
          </p>
        );
      })}
    </div>
  );
}

export function EmphaticTitle({
  title,
  emphasis,
  as: Tag = "h1",
  id,
}: {
  title: string;
  emphasis?: string;
  as?: "h1" | "h2" | "h3";
  id?: string;
}) {
  if (!emphasis || !title.includes(emphasis)) return <Tag id={id}>{title}</Tag>;
  const index = title.indexOf(emphasis);
  return (
    <Tag id={id}>
      {title.slice(0, index)}
      <em>{emphasis}</em>
      {title.slice(index + emphasis.length)}
    </Tag>
  );
}
