import { qrMatrix } from "@/lib/qr";

export function QrCode({ value, title, className }: { value: string; title: string; className?: string }) {
  const matrix = qrMatrix(value);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  let path = "";
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (matrix[y][x]) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg className={className ?? "qr-code"} viewBox={`0 0 ${size} ${size}`} role="img" shapeRendering="crispEdges">
      <title>{title}</title>
      <rect width={size} height={size} fill="#ffffff" />
      <path fill="#1C2733" d={path} />
    </svg>
  );
}
