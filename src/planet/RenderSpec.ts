export type Style = 'nebula' | 'fracture' | 'crystal';
export interface FractureSpec {density:number;branching:number;directionality:number;distortion:number;width:number;coverage:number;depth:number;}
/** Greenheck terrain/noise and elevation-layer controls; independent of decorative family. */
export interface TerrainSpec {
 noise:'simplex'|'fractal'|'ridged';amplitude:number;sharpness:number;offset:number;period:number;persistence:number;lacunarity:number;octaves:number;
 relief:number;bumpStrength:number;bumpOffset:number;
 colors:[string,string,string,string,string];transitions:[number,number,number,number];blends:[number,number,number,number];
}
export interface WeatherSpec {density:number;opacity:number;scale:number;altitude:number;thickness:number;size:number;particles:number;speed:number;drift:number;color:string;}
export interface MascotSpec {enabled:boolean;outfit:'classic'|'tour'|'explorer'|'dreamer';accessory:'none'|'guitar'|'headphones'|'camera'|'book'|'gamepad';accent:string;label:string;meaning:string;}
export interface LandmarkSpec {id:string;icon:'music'|'guitar'|'headphones'|'camera'|'compass'|'mountain'|'book'|'gamepad'|'lightning'|'heart'|'moon'|'chat'|'star'|'wave'|'flower';label:string;meaning:string;color:string;placement:'companion'|'surface';evidenceIds:string[];}
export interface RenderSpec {
  version: 1;
  style: Style;
  seed: number;
  geometry: { enabled: boolean; type: 'flowing' | 'tectonic' | 'faceted'; complexity: number; displacement: number; fractures?:FractureSpec|null };
  material: { palette: [string, string, string]; roughness: number; metalness: number; emission: number };
  atmosphere: { enabled: boolean; color: string; strength: number };
  orbits: { enabled: boolean; type: 'ribbons' | 'broken' | 'angular' | 'dust'; tilt: number };
  structures: { enabled: boolean; count: number };
  lighting: { enabled: boolean; intensity: number; ambient: number };
  animation: { enabled: boolean; rotation: number; flow: number };
  modules: { stars: boolean; clouds: boolean; postFX: boolean };
  quality: 'low' | 'balanced' | 'high';
  mascot:MascotSpec;
  landmarks:LandmarkSpec[];
  terrain?:TerrainSpec;
  weather?:WeatherSpec;
}
const record = (v: unknown): Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('RenderSpec requires objects.');
  return v as Record<string, unknown>;
};
/** Strict validation at the future Style Compiler boundary. Reject invalid specs; never silently clamp them. */
export function validateRenderSpec(input: unknown): RenderSpec {
  const strict=RenderSpecSchema.safeParse(input);
  if(!strict.success)throw new Error('RenderSpec failed strict schema validation: '+strict.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; '));
  const s = record(input);
  if (s.version !== 1) throw new Error('Unsupported RenderSpec version.');
  if (!['nebula','fracture','crystal'].includes(String(s.style))) throw new Error('Unknown style.');
  if (!Number.isInteger(s.seed) || (s.seed as number) < 0 || (s.seed as number) > 4294967295) throw new Error('Seed must be a uint32.');
  if (!['low','balanced','high'].includes(String(s.quality))) throw new Error('Unknown quality.');
  const number = (o: Record<string, unknown>, key: string, min: number, max: number) => {
    const n = o[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid ${key}: expected ${min}–${max}.`);
  };
  const bool = (o: Record<string, unknown>, key: string) => { if (typeof o[key] !== 'boolean') throw new Error(`Invalid boolean: ${key}.`); };
  const color = (v: unknown) => { if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('Colors must be six-digit hex strings.'); };
  for (const key of ['geometry','atmosphere','orbits','structures','lighting','animation']) bool(record(s[key]), 'enabled');
  const g = record(s.geometry), m = record(s.material), a = record(s.atmosphere), o = record(s.orbits), f = record(s.structures), l = record(s.lighting), anim = record(s.animation), modules = record(s.modules);
  if (!['flowing','tectonic','faceted'].includes(String(g.type))) throw new Error('Unknown geometry family.');
  if (!['ribbons','broken','angular','dust'].includes(String(o.type))) throw new Error('Unknown orbital family.');
  number(g,'complexity',0,1); number(g,'displacement',0,0.4);
  if (!Array.isArray(m.palette) || m.palette.length !== 3) throw new Error('Palette requires three colors.');
  m.palette.forEach(color); number(m,'roughness',0.05,1); number(m,'metalness',0,1); number(m,'emission',0,2);
  color(a.color); number(a,'strength',0,1.5); number(o,'tilt',-1.5,1.5); number(f,'count',0,64);
  if (!Number.isInteger(f.count)) throw new Error('Structure count must be an integer.');
  number(l,'intensity',0,3); number(l,'ambient',0,1); number(anim,'rotation',0,0.2); number(anim,'flow',0,1);
  for (const k of ['stars','clouds','postFX']) bool(modules,k);
  return structuredClone(input) as RenderSpec;
}
import { RenderSpecSchema } from '../ai/schemas.ts';
