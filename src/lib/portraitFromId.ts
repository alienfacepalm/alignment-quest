/** FNV-1a 32-bit — stable hash for any string id. */
export function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

/** Mulberry32 PRNG from a seed (deterministic stream). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t >>> 0) / 4294967296;
  };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const lit = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lit - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseAccent(accent: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(accent.trim());
  const hex = m?.[1];
  if (!hex) return null;
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Shirt color: accent-tinted, varied by rng. */
export function shirtColor(accent: string, rng: () => number): string {
  const base = parseAccent(accent);
  if (base) {
    const [r0, g0, b0] = base;
    const mix = 0.55 + rng() * 0.35;
    const lift = rng() * 28 - 8;
    return rgbToHex(
      Math.round(r0 * mix + lift),
      Math.round(g0 * mix + lift),
      Math.round(b0 * mix + lift),
    );
  }
  const [r, g, b] = hslToRgb(rng() * 360, 0.35 + rng() * 0.25, 0.32 + rng() * 0.2);
  return rgbToHex(r, g, b);
}
