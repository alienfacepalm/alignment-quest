import { createRng, hashId, hslToRgb, rgbToHex, shirtColor } from "./portraitFromId";

export type PersonPortraitProps = {
  personId: string;
  accent: string;
  size?: number;
  accessibilityLabel?: string;
};

export type PortraitPalette = {
  skin: string;
  skinShadow: string;
  hair: string;
  shirt: string;
  blobA: string;
  blobB: string;
  pupil: string;
  hairTop: number;
  hairWidth: number;
  hairHeight: number;
  faceW: number;
  faceH: number;
  faceTop: number;
  eyeSize: number;
  eyeGap: number;
  eyeFromTop: number;
  pupilShift: number;
  mouthW: number;
};

function buildPalette(personId: string, accent: string, size: number): PortraitPalette {
  const rng = createRng(hashId(personId));
  const hairHue = rng() * 360;
  const hairS = 0.28 + rng() * 0.38;
  const hairL = 0.12 + rng() * 0.32;
  const [hr, hg, hb] = hslToRgb(hairHue, hairS, hairL);
  const hair = rgbToHex(hr, hg, hb);

  const skinHue = 18 + rng() * 32;
  const skinS = 0.22 + rng() * 0.28;
  const skinL = 0.58 + rng() * 0.22;
  const [sr, sg, sb] = hslToRgb(skinHue, skinS, skinL);
  const skin = rgbToHex(sr, sg, sb);
  const [sr2, sg2, sb2] = hslToRgb(skinHue, Math.min(0.45, skinS + 0.08), skinL - 0.12);
  const skinShadow = rgbToHex(sr2, sg2, sb2);

  const shirt = shirtColor(accent, rng);
  const [br, bg, bb] = hslToRgb((hashId(personId + "a") % 360) + rng() * 40, 0.35 + rng() * 0.2, 0.25 + rng() * 0.15);
  const blobA = rgbToHex(br, bg, bb);
  const [br2, bg2, bb2] = hslToRgb((hashId(personId + "b") % 360) + rng() * 30, 0.3 + rng() * 0.15, 0.2 + rng() * 0.12);
  const blobB = rgbToHex(br2, bg2, bb2);

  const pupilHue = rng() * 360;
  const [pr, pg, pb] = hslToRgb(pupilHue, 0.25 + rng() * 0.35, 0.12 + rng() * 0.18);
  const pupil = rgbToHex(pr, pg, pb);

  return {
    skin,
    skinShadow,
    hair,
    shirt,
    blobA,
    blobB,
    pupil,
    hairTop: 0.06 + rng() * 0.06,
    hairWidth: 0.58 + rng() * 0.14,
    hairHeight: 0.22 + rng() * 0.1,
    faceW: 0.5 + rng() * 0.08,
    faceH: 0.42 + rng() * 0.08,
    faceTop: 0.15 + rng() * 0.04,
    eyeSize: 0.1 + rng() * 0.05,
    eyeGap: 0.08 + rng() * 0.05,
    eyeFromTop: 0.34 + rng() * 0.08,
    pupilShift: (rng() - 0.5) * size * 0.03,
    mouthW: 0.14 + rng() * 0.08,
  };
}

/** Shared layout for Skia (native) and View (web) portrait renderers. */
export type PortraitLayout = {
  size: number;
  palette: PortraitPalette;
  faceW: number;
  faceH: number;
  faceLeft: number;
  faceTop: number;
  eye: number;
  hairW: number;
  hairH: number;
  hairLeft: number;
  hairTop: number;
  shirtH: number;
  neckW: number;
  neckH: number;
  neckLeft: number;
  neckTop: number;
  shirtTop: number;
  blob1: { x: number; y: number; w: number; h: number; opacity: number };
  blob2: { x: number; y: number; w: number; h: number; opacity: number };
  eyeY: number;
  leftScleraCx: number;
  rightScleraCx: number;
  pupilR: number;
  mouthW: number;
  mouthH: number;
  mouthCx: number;
  mouthCy: number;
};

export function getPortraitLayout(personId: string, accent: string, size: number): PortraitLayout {
  const palette = buildPalette(personId, accent, size);
  const faceW = size * palette.faceW;
  const faceH = size * palette.faceH;
  const faceLeft = (size - faceW) / 2;
  const faceTop = size * palette.faceTop;
  const eye = Math.max(size * 0.06, size * palette.eyeSize);
  const hairW = size * palette.hairWidth;
  const hairH = size * palette.hairHeight;
  const hairLeft = (size - hairW) / 2;
  const hairTop = size * palette.hairTop;
  const shirtH = size * 0.44;
  const neckW = size * 0.26;
  const neckH = size * 0.1;
  const neckLeft = (size - neckW) / 2;
  const shirtTop = size - shirtH;
  const neckTop = size - size * 0.4 - neckH;

  const pad = faceW * (0.12 + palette.eyeGap);
  const innerW = faceW - 2 * pad;
  const rowW = 2 * eye + faceW * palette.eyeGap;
  const rowStartX = faceLeft + pad + (innerW - rowW) / 2;
  const eyeY = faceTop + faceH * palette.eyeFromTop + eye / 2;
  const leftScleraCx = rowStartX + eye / 2;
  const rightScleraCx = rowStartX + eye + faceW * palette.eyeGap + eye / 2;
  const pupilR = (eye * 0.45) / 2;
  const mouthW = faceW * palette.mouthW;
  const mouthH = Math.max(2, size * 0.018);
  const mouthCx = faceLeft + faceW / 2;
  const mouthCy = faceTop + faceH - faceH * 0.16 - mouthH / 2;

  return {
    size,
    palette,
    faceW,
    faceH,
    faceLeft,
    faceTop,
    eye,
    hairW,
    hairH,
    hairLeft,
    hairTop,
    shirtH,
    neckW,
    neckH,
    neckLeft,
    neckTop,
    shirtTop,
    blob1: {
      x: -size * 0.12,
      y: -size * 0.06,
      w: size * 0.75,
      h: size * 0.55,
      opacity: 0.45,
    },
    blob2: {
      x: size * 0.38,
      y: size * 0.28,
      w: size * 0.65,
      h: size * 0.5,
      opacity: 0.35,
    },
    eyeY,
    leftScleraCx,
    rightScleraCx,
    pupilR,
    mouthW,
    mouthH,
    mouthCx,
    mouthCy,
  };
}
