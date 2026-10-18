import { Vector3 } from 'three';
// Adapted from Eluvade/cosmos src/seed.ts, MIT © 2026 Eluvade. See THIRD_PARTY_NOTICES.md.
export function hashSeed(base: number, layer: number): number {
  let h = (Math.imul(base | 0, 2654435761) + Math.imul(layer | 0, 2246822519)) | 0;
  h = Math.imul((h >>> 16) ^ h, 0x45d9f3b); h = Math.imul((h >>> 16) ^ h, 0x45d9f3b);
  h = (h >>> 16) ^ h;
  return ((h >>> 0) % 10000) / 10000;
}
export function noise(x: number, y: number, z: number): number {
  const hash = (a: number, b: number, c: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123; return v - Math.floor(v); };
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let a = x - ix, b = y - iy, c = z - iz;
  a *= a * (3 - 2 * a); b *= b * (3 - 2 * b); c *= c * (3 - 2 * c);
  const mix = (v: number, w: number, t: number) => v + (w - v) * t;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
}
export function cellsForSeed(seed: number): Vector3[] {
  return Array.from({length: 18}, (_, i) => {
    const y = 1 - (i + 0.5) / 9, a = i * 2.399963 + hashSeed(seed,i) * 0.6;
    const r = Math.sqrt(1 - y * y); return new Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
  });
}
export function cellGap(x: number, y: number, z: number, cells: Vector3[]): number {
  let first = 10, second = 10;
  for (const c of cells) { const d = (x-c.x)**2+(y-c.y)**2+(z-c.z)**2; if(d < first) { second = first; first = d; } else if(d < second) second=d; }
  return second-first;
}
