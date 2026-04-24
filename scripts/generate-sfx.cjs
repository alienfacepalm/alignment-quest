/**
 * Writes tiny PCM WAV files for lightweight UI SFX (no external assets).
 */
const fs = require("fs");
const path = require("path");

const sampleRate = 22050;

function writeWav16Mono(filepath, durationSec, fn) {
  const n = Math.floor(sampleRate * durationSec);
  const dataSize = n * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const s = Math.max(-1, Math.min(1, fn(t, i / n)));
    buffer.writeInt16LE(Math.round(s * 0.35 * 32767), o);
    o += 2;
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buffer);
}

const out = path.join(__dirname, "..", "assets", "sfx");

writeWav16Mono(path.join(out, "tap.wav"), 0.04, (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 90));
writeWav16Mono(path.join(out, "place.wav"), 0.09, (t) => {
  const f = 520 + 180 * t;
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28);
});
writeWav16Mono(path.join(out, "score.wav"), 0.14, (t, u) => {
  const f = 360 + 520 * u;
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 12);
});

console.log("Wrote", out);
