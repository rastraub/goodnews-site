import { CopyLink } from "./copy-link";

export function CopyBlock({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <div className="copy-block">
      <pre tabIndex={0}>
        <code>{value}</code>
      </pre>
      <CopyLink value={value} label={label} />
    </div>
  );
}
