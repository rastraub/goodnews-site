import { qrMatrix } from "@/lib/qr";

export function QrCode({ value, label }: { value: string; label: string }) {
  const matrix = qrMatrix(value);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  let path = "";
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix.length; col += 1) {
      if (matrix[row][col]) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg className="qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <title>{label}</title>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#1C2733" />
    </svg>
  );
}
