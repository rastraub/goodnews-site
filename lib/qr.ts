/**
 * QR codes for printed shelf cards.
 * Byte mode, error correction M, versions 1–6. No network call and no extra package.
 * A quiet zone is included when the matrix is drawn as SVG.
 */

const ECC_M = 0;

type Version = 1 | 2 | 3 | 4 | 5 | 6;

type Spec = {
  size: number;
  data: number;
  ecc: number;
  blocks: number;
  align: number[];
};

const SPECS: Record<Version, Spec> = {
  1: { size: 21, data: 16, ecc: 10, blocks: 1, align: [] },
  2: { size: 25, data: 28, ecc: 16, blocks: 1, align: [6, 18] },
  3: { size: 29, data: 44, ecc: 26, blocks: 1, align: [6, 22] },
  4: { size: 33, data: 64, ecc: 18, blocks: 2, align: [6, 26] },
  5: { size: 37, data: 86, ecc: 24, blocks: 2, align: [6, 30] },
  6: { size: 41, data: 108, ecc: 16, blocks: 4, align: [6, 34] },
};

/** Format-info cells beside the top-left finder, LSB first. Column, then row. */
const FORMAT_COORDS: ReadonlyArray<readonly [number, number]> = [
  [8, 0],
  [8, 1],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [8, 7],
  [8, 8],
  [7, 8],
  [5, 8],
  [4, 8],
  [3, 8],
  [2, 8],
  [1, 8],
  [0, 8],
];

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * (x & 0xff);
    z &= 0xff;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = (byte ^ result[0]) & 0xff;
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }
  return result;
}

function pushBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function chooseVersion(byteLength: number): Version {
  const bitsNeeded = 4 + 8 + byteLength * 8;
  for (const version of [1, 2, 3, 4, 5, 6] as const) {
    if (bitsNeeded <= SPECS[version].data * 8) return version;
  }
  throw new Error("That address is too long for a shelf QR code.");
}

function dataCodewords(text: string, spec: Spec): number[] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  for (const byte of bytes) pushBits(bits, byte, 8);
  const capacity = spec.data * 8;
  pushBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) value = (value << 1) | bits[i + j];
    words.push(value);
  }
  const pads = [0xec, 0x11];
  let pad = 0;
  while (words.length < spec.data) {
    words.push(pads[pad % 2]);
    pad += 1;
  }
  return words;
}

function codewordBits(text: string, spec: Spec): number[] {
  const words = dataCodewords(text, spec);
  const perBlock = spec.data / spec.blocks;
  const divisor = reedSolomonDivisor(spec.ecc);
  const blocks: { data: number[]; ecc: number[] }[] = [];
  for (let i = 0; i < spec.blocks; i++) {
    const data = words.slice(i * perBlock, (i + 1) * perBlock);
    blocks.push({ data, ecc: reedSolomonRemainder(data, divisor) });
  }
  const out: number[] = [];
  for (let i = 0; i < perBlock; i++) {
    for (const block of blocks) out.push(block.data[i]);
  }
  for (let i = 0; i < spec.ecc; i++) {
    for (const block of blocks) out.push(block.ecc[i]);
  }
  const bits: number[] = [];
  for (const word of out) pushBits(bits, word, 8);
  return bits;
}

function maskFlip(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function formatBits(mask: number): number {
  const data = (ECC_M << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function blank(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(false));
}

function drawFinder(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || x < 0 || y >= modules.length || x >= modules.length) continue;
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const edge = r === 0 || r === 6 || c === 0 || c === 6;
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[y][x] = inside && (edge || core);
      reserved[y][x] = true;
    }
  }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  if (reserved[row][col]) return;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const y = row + r;
      const x = col + c;
      modules[y][x] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      reserved[y][x] = true;
    }
  }
}

function reserveFormat(reserved: boolean[][]) {
  const size = reserved.length;
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function drawFunctionPatterns(version: Version): { modules: boolean[][]; reserved: boolean[][] } {
  const spec = SPECS[version];
  const modules = blank(spec.size);
  const reserved = blank(spec.size);
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, 0, spec.size - 7);
  drawFinder(modules, reserved, spec.size - 7, 0);
  for (const row of spec.align) {
    for (const col of spec.align) drawAlignment(modules, reserved, row, col);
  }
  for (let i = 0; i < spec.size; i++) {
    if (!reserved[6][i]) {
      modules[6][i] = i % 2 === 0;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      modules[i][6] = i % 2 === 0;
      reserved[i][6] = true;
    }
  }
  const darkRow = 4 * version + 9;
  modules[darkRow][8] = true;
  reserved[darkRow][8] = true;
  reserveFormat(reserved);
  return { modules, reserved };
}

function placeData(modules: boolean[][], reserved: boolean[][], dataBits: number[], mask: number) {
  const size = modules.length;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (reserved[y][x]) continue;
        let dark = index < dataBits.length ? dataBits[index] === 1 : false;
        index += 1;
        if (maskFlip(mask, y, x)) dark = !dark;
        modules[y][x] = dark;
      }
    }
  }
}

function drawFormat(modules: boolean[][], mask: number) {
  const bits = formatBits(mask);
  const size = modules.length;
  for (let i = 0; i < 15; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const [x, y] = FORMAT_COORDS[i];
    modules[y][x] = dark;
    if (i < 8) modules[8][size - 1 - i] = dark;
    else modules[size - 15 + i][8] = dark;
  }
}

function cloneMatrix(source: boolean[][]): boolean[][] {
  return source.map((row) => row.slice());
}

function bit(modules: boolean[][], row: number, col: number): number {
  return modules[row][col] ? 1 : 0;
}

/**
 * Mask penalty from the QR spec, the same weights a typical encoder uses,
 * so the chosen mask matches a scanner-tested symbol.
 */
function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  for (let row = 0; row < size; row++) {
    let sameCol = 0;
    let sameRow = 0;
    let lastCol = -1;
    let lastRow = -1;
    for (let col = 0; col < size; col++) {
      const across = bit(modules, row, col);
      if (across === lastCol) sameCol += 1;
      else {
        if (sameCol >= 5) score += 3 + (sameCol - 5);
        lastCol = across;
        sameCol = 1;
      }
      const down = bit(modules, col, row);
      if (down === lastRow) sameRow += 1;
      else {
        if (sameRow >= 5) score += 3 + (sameRow - 5);
        lastRow = down;
        sameRow = 1;
      }
    }
    if (sameCol >= 5) score += 3 + (sameCol - 5);
    if (sameRow >= 5) score += 3 + (sameRow - 5);
  }

  let blocks = 0;
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const sum =
        bit(modules, row, col) +
        bit(modules, row, col + 1) +
        bit(modules, row + 1, col) +
        bit(modules, row + 1, col + 1);
      if (sum === 0 || sum === 4) blocks += 1;
    }
  }
  score += blocks * 3;

  for (let row = 0; row < size; row++) {
    let bitsCol = 0;
    let bitsRow = 0;
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | bit(modules, row, col);
      if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) score += 40;
      bitsRow = ((bitsRow << 1) & 0x7ff) | bit(modules, col, row);
      if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) score += 40;
    }
  }

  let dark = 0;
  for (const row of modules) {
    for (const cell of row) if (cell) dark += 1;
  }
  const k = Math.abs(Math.ceil(dark * 100 / (size * size) / 5) - 10);
  score += k * 10;
  return score;
}

function matrixForMask(text: string, mask: number): boolean[][] {
  const version = chooseVersion(new TextEncoder().encode(text).length);
  const bits = codewordBits(text, SPECS[version]);
  const base = drawFunctionPatterns(version);
  const modules = cloneMatrix(base.modules);
  placeData(modules, base.reserved, bits, mask);
  drawFormat(modules, mask);
  return modules;
}

/** Dark modules, row by row, without the quiet zone. */
export function qrMatrix(text: string): boolean[][] {
  if (!text) throw new Error("A QR code needs text.");
  let best: boolean[][] | undefined;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const modules = matrixForMask(text, mask);
    const score = penalty(modules);
    if (score < bestScore) {
      best = modules;
      bestScore = score;
    }
  }
  if (!best) throw new Error("QR mask selection failed.");
  return best;
}

export function qrSvg(text: string, title = "QR code"): string {
  const matrix = qrMatrix(text);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  let path = "";
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (matrix[y][x]) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  const label = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img">
  <title>${label}</title>
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <path fill="#1C2733" d="${path}"/>
</svg>
`;
}
