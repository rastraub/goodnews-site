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
  return (
    <div className="prose">
      {blocks.map((block, index) => (
        <p key={index}>
          <RichText text={block} />
        </p>
      ))}
    </div>
  );
}

export function EmphaticTitle({
  title,
  emphasis,
  as: Tag = "h1",
}: {
  title: string;
  emphasis?: string;
  as?: "h1" | "h2" | "h3";
}) {
  if (!emphasis || !title.includes(emphasis)) return <Tag>{title}</Tag>;
  const index = title.indexOf(emphasis);
  return (
    <Tag>
      {title.slice(0, index)}
      <em>{emphasis}</em>
      {title.slice(index + emphasis.length)}
    </Tag>
  );
}
