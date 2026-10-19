import { z } from 'zod';
const text=z.string().min(1).max(4000),color=z.string().regex(/^#[0-9a-fA-F]{6}$/),unit=z.number().min(0).max(1);
export const ContentSchema=z.strictObject({
  posts:z.array(z.string().max(10000)).max(30),interests:z.array(z.string().max(200)).max(40),
  music:z.array(z.strictObject({title:z.string().max(300),artist:z.string().max(300),metadata:z.string().max(2000)})).max(30),
  images:z.array(z.strictObject({description:z.string().max(3000),dataUrl:z.string().max(4000000).regex(/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$/)})).max(3),
  videos:z.array(z.strictObject({title:z.string().max(300),caption:z.string().max(3000),tags:z.array(z.string().max(100)).max(30)})).max(10),
  otherComments:z.array(z.string().max(3000)).max(20),seed:z.number().int().min(0).max(4294967295),
});
export type UserContent=z.infer<typeof ContentSchema>;
const evidence=z.array(z.string().max(40)).max(12);
const DirectionSchema=z.strictObject({id:text,name:text,vision:text,composition:text,motion:text,weatherIntent:text.optional()});
export const DNASchema=z.strictObject({
  version:z.literal(1),seed:z.number().int().min(0).max(4294967295),title:text,vision:text,
  emotionalAtmosphere:text,
  themes:z.array(z.strictObject({name:text,interpretation:text,evidenceIds:evidence,confidence:z.enum(['tentative','supported'])})).min(1).max(7),
  contrasts:z.array(z.strictObject({between:z.array(text).length(2),relationship:text,evidenceIds:evidence})).max(5),
  motifs:z.array(z.strictObject({description:text,meaning:text})).max(10),
  directions:z.array(DirectionSchema).min(2).max(3),
  selectedDirectionId:text,intensity:unit,uncertainty:text,
});
export type UniverseDNA=z.infer<typeof DNASchema>;
// Saved DNA stays readable; every NEW profile must make an explicit qualitative
// weather choice, rather than leaving mist to an incidental adjective.
export const ProfileDNASchema=DNASchema.extend({directions:z.array(DirectionSchema.required()).min(2).max(3)});
export const MascotSchema=z.strictObject({enabled:z.boolean(),outfit:z.enum(['classic','tour','explorer','dreamer']),accessory:z.enum(['none','guitar','headphones','camera','book','gamepad']),accent:color,label:z.string().max(48),meaning:z.string().min(1).max(800)});
export const LandmarkSchema=z.strictObject({id:z.string().min(1).max(32),icon:z.enum(['music','guitar','headphones','camera','compass','mountain','book','gamepad','lightning','heart','moon','chat','star','wave','flower']),label:z.string().min(1).max(20),meaning:z.string().min(1).max(600),color,placement:z.enum(['companion','surface']),evidenceIds:evidence});
export const FractureSchema=z.strictObject({density:unit,branching:unit,directionality:unit,distortion:unit,width:unit,coverage:unit,depth:unit});
export const TerrainSchema=z.strictObject({
 noise:z.enum(['simplex','fractal','ridged']),amplitude:z.number().min(.1).max(1.5),sharpness:z.number().min(0).max(5),offset:z.number().min(-2).max(2),period:z.number().min(.1).max(2),persistence:z.number().min(0).max(1),lacunarity:z.number().min(1).max(3),octaves:z.number().int().min(1).max(10),
 relief:z.number().min(0).max(.16),bumpStrength:unit,bumpOffset:z.number().min(.0001).max(.1),
 // Homogeneous fixed-length arrays avoid unsupported JSON Schema prefixItems
 // in strict Responses structured outputs, while retaining exact lengths.
 colors:z.array(color).length(5),transitions:z.array(z.number().min(0).max(3)).length(4),blends:z.array(unit).length(4),
});
const particleSize=z.number().min(0).max(200);
export const WeatherSchema=z.strictObject({density:z.number().min(-2).max(2),opacity:unit,scale:z.number().min(.05).max(1.5),altitude:z.number().min(.015).max(.3),thickness:z.number().min(.005).max(.25),size:z.number().min(10).max(160).optional(),minParticleSize:particleSize.optional(),maxParticleSize:particleSize.optional(),particles:z.number().int().min(1).max(50000),speed:z.number().min(0).max(.1),drift:z.number().min(-.1).max(.1),color});
export const LightingSchema=z.strictObject({enabled:z.boolean(),intensity:z.number().min(0).max(5),ambient:z.number().min(0).max(5),specular:z.number().min(0).max(5).optional(),shininess:z.number().min(0).max(25).optional(),direction:z.array(z.number().min(-1).max(1)).length(3).optional(),color:color.optional()});
export const BloomSchema=z.strictObject({threshold:unit,strength:unit,radius:z.number().min(0).max(2)});
const orbitControls={radius:z.number().min(1.2).max(3),width:z.number().min(.002).max(.6),layers:z.number().int().min(1).max(16),arc:z.number().min(.1).max(Math.PI*2),eccentricity:z.number().min(0).max(.8),warp:z.number().min(0).max(.3),particles:z.number().int().min(0).max(20000),particleSize:z.number().min(0).max(8),opacity:unit,speed:z.number().min(-.3).max(.3),precession:z.number().min(0).max(.3),inclination:z.number().min(-Math.PI).max(Math.PI),colors:z.array(color).length(2)};
export const OrbitSchema=z.strictObject({enabled:z.boolean(),type:z.enum(['ribbons','broken','angular','dust']),tilt:z.number().min(-1.5).max(1.5),...Object.fromEntries(Object.entries(orbitControls).map(([k,v])=>[k,v.optional()]))});
const CompleteOrbitSchema=OrbitSchema.extend(orbitControls);
const CompleteWeatherSchema=WeatherSchema.omit({size:true}).extend({minParticleSize:particleSize,maxParticleSize:particleSize});
const CompleteLightingSchema=LightingSchema.required();
export const RenderSpecSchema=z.strictObject({
 version:z.literal(1),style:z.enum(['nebula','fracture','crystal']),seed:z.number().int().min(0).max(4294967295),
 geometry:z.strictObject({enabled:z.boolean(),type:z.enum(['flowing','tectonic','faceted']),complexity:unit,displacement:z.number().min(0).max(.4),fractures:FractureSchema.nullable().optional()}),
 material:z.strictObject({palette:z.array(color).length(3),roughness:z.number().min(.05).max(1),metalness:unit,emission:z.number().min(0).max(2)}),
 atmosphere:z.strictObject({enabled:z.boolean(),color,strength:z.number().min(0).max(1.5)}),
 orbits:OrbitSchema,
 structures:z.strictObject({enabled:z.boolean(),count:z.number().int().min(0).max(64)}),
 lighting:LightingSchema,
 animation:z.strictObject({enabled:z.boolean(),rotation:z.number().min(0).max(.2),flow:unit}),
 modules:z.strictObject({stars:z.boolean(),clouds:z.boolean(),postFX:z.boolean()}),quality:z.enum(['low','balanced','high']),mascot:MascotSchema,landmarks:z.array(LandmarkSchema).max(10),
 terrain:TerrainSchema.optional(),weather:WeatherSchema.optional(),bloom:BloomSchema.optional(),
});
// Old saved worlds may omit fractures; new LLM outputs explicitly choose an
// object (tectonic) or null. Required fields also satisfy strict Responses schemas.
export const CompiledRenderSpecSchema=RenderSpecSchema.extend({geometry:RenderSpecSchema.shape.geometry.extend({fractures:FractureSchema.nullable()}),terrain:TerrainSchema,weather:CompleteWeatherSchema,lighting:CompleteLightingSchema,orbits:CompleteOrbitSchema,bloom:BloomSchema}).superRefine((s,ctx)=>{
 if(s.weather.minParticleSize>s.weather.maxParticleSize)ctx.addIssue({code:'custom',path:['weather','maxParticleSize'],message:'Maximum cloud size must be at least minimum size.'});
 if(Math.hypot(...s.lighting.direction)<.001)ctx.addIssue({code:'custom',path:['lighting','direction'],message:'Light direction must be nonzero.'});
 for(let i=1;i<4;i++)if(s.terrain.transitions[i]<s.terrain.transitions[i-1])ctx.addIssue({code:'custom',path:['terrain','transitions'],message:'Elevation transitions must be ordered.'});
});
export const EXPRESSION_MODULES=['geometry','material','weather','atmosphere','orbits','structures','lighting','bloom','animation','mascot','landmarks'] as const;
export const DecisionSchema=z.strictObject({intent:text,module:z.enum(EXPRESSION_MODULES),implementation:text});
export const RenderReadingSchema=z.strictObject({interpretation:text,decisions:z.array(DecisionSchema).max(14),fallbacks:z.array(z.strictObject({requested:text,substitute:text,reason:text})).max(8),degraded:z.boolean(),manuallyEdited:z.boolean().optional()});
export const CompilationSchema=z.strictObject({
 renderSpec:CompiledRenderSpecSchema,directionId:text,interpretation:text,
 decisions:z.array(DecisionSchema).min(1).max(14),
 fallbacks:z.array(z.strictObject({requested:text,substitute:text,reason:text})).max(8),
});
