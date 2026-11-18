/**
 * Byte-mode QR codes, versions 1 through 5, error correction L.
 * Enough for a short signup URL. No package and no network call.
 * The matrix is built at render time from the public URL.
 */

const ECC_CODEWORDS = [0, 7, 10, 15, 20, 26];
const DATA_CODEWORDS = [0, 19, 34, 55, 80, 108];
const REMAINDER_BITS = [0, 0, 7, 7, 7, 7];
const ALIGNMENT = [[], [], [6, 18], [6, 22], [6, 26], [6, 30]];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

function initField() {
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}

initField();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Reed-Solomon generator, highest degree first. Degree 7 is the version-1 check. */
export function reedSolomonGenerator(degree: number): number[] {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(result.length + 1).fill(0);
    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= result[j];
      next[j + 1] ^= mul(result[j], EXP[i]);
    }
    result = next;
  }
  return result;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    if (factor === 0) continue;
    for (let i = 0; i < result.length; i += 1) {
      result[i] ^= mul(generator[i + 1], factor);
    }
  }
  return result;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function bytesOf(text: string): number[] {
  return [...new TextEncoder().encode(text)];
}

function chooseVersion(payload: number): number {
  for (let version = 1; version <= 5; version += 1) {
    const bits = 4 + 8 + payload * 8;
    if (Math.ceil(bits / 8) <= DATA_CODEWORDS[version]) return version;
  }
  throw new Error("QR text is too long for a version 1–5 code.");
}

function dataBits(payload: number[], version: number): number[] {
  const capacity = DATA_CODEWORDS[version] * 8;
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, payload.length, 8);
  for (const byte of payload) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const pads = [0xec, 0x11];
  let pad = 0;
  while (bits.length < capacity) {
    appendBits(bits, pads[pad % 2], 8);
    pad += 1;
  }
  return bits;
}

function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    bytes.push(value);
  }
  return bytes;
}

function bytesToBits(bytes: number[]): number[] {
  const bits: number[] = [];
  for (const byte of bytes) appendBits(bits, byte, 8);
  return bits;
}

/** ECC level L is indicator 01. */
function formatBits(mask: number): number {
  const data = (0b01 << 3) | mask;
  let rem = data << 10;
  for (let i = 4; i >= 0; i -= 1) {
    if ((rem >>> (i + 10)) & 1) rem ^= 0x537 << i;
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function maskFlips(mask: number, row: number, col: number): boolean {
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
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return false;
  }
}

type Template = { dark: boolean[][]; fun: boolean[][] };

function empty(size: number): Template {
  return {
    dark: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
    fun: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
  };
}

function mark(template: Template, col: number, row: number, dark: boolean) {
  template.dark[row][col] = dark;
  template.fun[row][col] = true;
}

function drawFinder(template: Template, col: number, row: number, size: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const y = row + dy;
      const x = col + dx;
      if (y < 0 || x < 0 || y >= size || x >= size) continue;
      const inside = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
      const edge = dy === 0 || dy === 6 || dx === 0 || dx === 6;
      const core = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
      mark(template, x, y, inside && (edge || core));
    }
  }
}

function drawAlignment(template: Template, col: number, row: number) {
  if (template.fun[row][col]) return;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      mark(template, col + dx, row + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function reserveFormat(template: Template, size: number) {
  for (let i = 0; i <= 5; i += 1) mark(template, 8, i, false);
  mark(template, 8, 7, false);
  mark(template, 8, 8, false);
  mark(template, 7, 8, false);
  for (let i = 9; i < 15; i += 1) mark(template, 14 - i, 8, false);
  for (let i = 0; i < 8; i += 1) mark(template, size - 1 - i, 8, false);
  for (let i = 8; i < 15; i += 1) mark(template, 8, size - 15 + i, false);
  mark(template, 8, size - 8, true);
}

function functionTemplate(version: number): Template {
  const size = 21 + 4 * (version - 1);
  const template = empty(size);
  drawFinder(template, 0, 0, size);
  drawFinder(template, size - 7, 0, size);
  drawFinder(template, 0, size - 7, size);
  for (const row of ALIGNMENT[version]) {
    for (const col of ALIGNMENT[version]) drawAlignment(template, col, row);
  }
  for (let i = 0; i < size; i += 1) {
    if (!template.fun[6][i]) mark(template, i, 6, i % 2 === 0);
    if (!template.fun[i][6]) mark(template, 6, i, i % 2 === 0);
  }
  reserveFormat(template, size);
  return template;
}

function paintFormat(modules: boolean[][], size: number, mask: number) {
  const data = formatBits(mask);
  const bit = (i: number) => ((data >>> i) & 1) === 1;
  const set = (col: number, row: number, i: number) => {
    modules[row][col] = bit(i);
  };
  for (let i = 0; i <= 5; i += 1) set(8, i, i);
  set(8, 7, 6);
  set(8, 8, 7);
  set(7, 8, 8);
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, i);
  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, i);
  modules[size - 8][8] = true;
}

function placeData(template: Template, bits: number[], mask: number): boolean[][] {
  const size = template.dark.length;
  const modules = template.dark.map((row) => row.slice());
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (template.fun[row][col]) continue;
        let dark = index < bits.length ? bits[index] === 1 : false;
        if (maskFlips(mask, row, col)) dark = !dark;
        modules[row][col] = dark;
        index += 1;
      }
    }
  }
  paintFormat(modules, size, mask);
  return modules;
}

function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;
  const runScore = (line: boolean[]) => {
    let total = 0;
    let run = 1;
    for (let i = 1; i < line.length; i += 1) {
      if (line[i] === line[i - 1]) run += 1;
      else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) total += 3 + (run - 5);
    return total;
  };
  for (let row = 0; row < size; row += 1) score += runScore(modules[row]);
  for (let col = 0; col < size; col += 1) score += runScore(modules.map((row) => row[col]));
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const value = modules[row][col];
      if (value === modules[row][col + 1] && value === modules[row + 1][col] && value === modules[row + 1][col + 1]) {
        score += 3;
      }
    }
  }
  const finderLike = (line: boolean[]) => {
    let total = 0;
    for (let i = 0; i <= line.length - 11; i += 1) {
      const window = line.slice(i, i + 11).map((dark) => (dark ? "1" : "0")).join("");
      if (window === "10111010000" || window === "00001011101") total += 40;
    }
    return total;
  };
  for (let row = 0; row < size; row += 1) score += finderLike(modules[row]);
  for (let col = 0; col < size; col += 1) score += finderLike(modules.map((row) => row[col]));
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/** Dark modules, row-major, without the quiet zone. */
export function qrMatrix(text: string): boolean[][] {
  const payload = bytesOf(text);
  if (!payload.length) throw new Error("QR text is empty.");
  const version = chooseVersion(payload.length);
  const packed = dataBits(payload, version);
  const data = bitsToBytes(packed);
  const ecc = reedSolomonRemainder(data, ECC_CODEWORDS[version]);
  const bits = bytesToBits([...data, ...ecc]);
  appendBits(bits, 0, REMAINDER_BITS[version]);
  const template = functionTemplate(version);
  let best: boolean[][] | undefined;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const modules = placeData(template, bits, mask);
    const score = penalty(modules);
    if (score < bestScore) {
      best = modules;
      bestScore = score;
    }
  }
  if (!best) throw new Error("QR mask selection failed.");
  return best;
}
