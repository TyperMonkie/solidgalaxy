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
export const DNASchema=z.strictObject({
  version:z.literal(1),seed:z.number().int().min(0).max(4294967295),title:text,vision:text,
  emotionalAtmosphere:text,
  themes:z.array(z.strictObject({name:text,interpretation:text,evidenceIds:evidence,confidence:z.enum(['tentative','supported'])})).min(1).max(7),
  contrasts:z.array(z.strictObject({between:z.array(text).length(2),relationship:text,evidenceIds:evidence})).max(5),
  motifs:z.array(z.strictObject({description:text,meaning:text})).max(10),
  directions:z.array(z.strictObject({id:text,name:text,vision:text,composition:text,motion:text})).min(2).max(3),
  selectedDirectionId:text,intensity:unit,uncertainty:text,
});
export type UniverseDNA=z.infer<typeof DNASchema>;
export const MascotSchema=z.strictObject({enabled:z.boolean(),outfit:z.enum(['classic','tour','explorer','dreamer']),accessory:z.enum(['none','guitar','headphones','camera','book','gamepad']),accent:color,label:z.string().max(48),meaning:z.string().min(1).max(800)});
export const LandmarkSchema=z.strictObject({id:z.string().min(1).max(32),icon:z.enum(['music','guitar','headphones','camera','compass','mountain','book','gamepad','lightning','heart','moon','chat','star','wave','flower']),label:z.string().min(1).max(20),meaning:z.string().min(1).max(600),color,placement:z.enum(['companion','surface']),evidenceIds:evidence});
export const FractureSchema=z.strictObject({density:unit,branching:unit,directionality:unit,distortion:unit,width:unit,coverage:unit,depth:unit});
export const RenderSpecSchema=z.strictObject({
 version:z.literal(1),style:z.enum(['nebula','fracture','crystal']),seed:z.number().int().min(0).max(4294967295),
 geometry:z.strictObject({enabled:z.boolean(),type:z.enum(['flowing','tectonic','faceted']),complexity:unit,displacement:z.number().min(0).max(.4),fractures:FractureSchema.nullable().optional()}),
 material:z.strictObject({palette:z.array(color).length(3),roughness:z.number().min(.05).max(1),metalness:unit,emission:z.number().min(0).max(2)}),
 atmosphere:z.strictObject({enabled:z.boolean(),color,strength:z.number().min(0).max(1.5)}),
 orbits:z.strictObject({enabled:z.boolean(),type:z.enum(['ribbons','broken','angular','dust']),tilt:z.number().min(-1.5).max(1.5)}),
 structures:z.strictObject({enabled:z.boolean(),count:z.number().int().min(0).max(64)}),
 lighting:z.strictObject({enabled:z.boolean(),intensity:z.number().min(0).max(3),ambient:unit}),
 animation:z.strictObject({enabled:z.boolean(),rotation:z.number().min(0).max(.2),flow:unit}),
 modules:z.strictObject({stars:z.boolean(),clouds:z.boolean(),postFX:z.boolean()}),quality:z.enum(['low','balanced','high']),mascot:MascotSchema,landmarks:z.array(LandmarkSchema).max(10),
});
// Old saved worlds may omit fractures; new LLM outputs explicitly choose an
// object (tectonic) or null. Required fields also satisfy strict Responses schemas.
export const CompiledRenderSpecSchema=RenderSpecSchema.extend({geometry:RenderSpecSchema.shape.geometry.extend({fractures:FractureSchema.nullable()})});
export const CompilationSchema=z.strictObject({
 renderSpec:CompiledRenderSpecSchema,directionId:text,interpretation:text,
 decisions:z.array(z.strictObject({intent:text,module:z.enum(['geometry','material','atmosphere','orbits','structures','lighting','animation']),implementation:text})).min(1).max(10),
 fallbacks:z.array(z.strictObject({requested:text,substitute:text,reason:text})).max(8),
});
