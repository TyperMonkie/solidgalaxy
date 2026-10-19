import { CompilationSchema, DNASchema, type UniverseDNA, type UserContent, type DecisionSchema } from './schemas.ts';
import type { z } from 'zod';
import { validateRenderSpec, type RenderSpec } from '../planet/RenderSpec.ts';
import { apiFetch } from '../public-access.ts';

export interface Interpretation {
  dna: UniverseDNA; renderSpec: RenderSpec; directionId: string; interpretation: string;
  decisions: z.infer<typeof DecisionSchema>[];
  fallbacks: {requested:string;substitute:string;reason:string}[]; degraded: boolean;
  mascotArtwork?: MascotArtwork;
  sourceContent?: UserContent;
  manuallyEdited?: boolean;
}
export interface MascotArtwork {imageUrl:string|null;status:'generated'|'unavailable';message:string;}
export type GenerationStage = 'profile' | 'compile';
async function request(path:string,input:unknown){
  const response=await apiFetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const json=await response.json();
  if(!response.ok)throw new Error(json.error||'生成暂未完成，请重试。');
  return json;
}
export function descriptionContent(description:string):UserContent {
  return {posts:[description.trim()],interests:[],music:[],images:[],videos:[],otherComments:[],seed:crypto.getRandomValues(new Uint32Array(1))[0]};
}
export async function compileUniverse(dna:UniverseDNA):Promise<Interpretation>{
  const json=await request('/api/compile',dna);
  // Degraded results deliberately have no decisions, and are visibly identified in the UI.
  if(!json.degraded)CompilationSchema.parse({renderSpec:json.renderSpec,directionId:json.directionId,interpretation:json.interpretation,decisions:json.decisions,fallbacks:json.fallbacks});
  if(json.directionId!==dna.selectedDirectionId||json.renderSpec.seed!==dna.seed)throw new Error('生成结果与当前解读不一致，请重试。');
  return {...json,dna,renderSpec:validateRenderSpec(json.renderSpec)};
}
export async function generateUniverse(content:UserContent,onStage?:(stage:GenerationStage)=>void):Promise<Interpretation>{
  onStage?.('profile');
  const profile=await request('/api/profile',content),dna=DNASchema.parse(profile.dna);
  if(dna.seed!==content.seed)throw new Error('解读标识不一致，请重试。');
  onStage?.('compile');
  return {...await compileUniverse(dna),sourceContent:content};
}
/** The image task runs after the planet is ready, so a slow image service never blocks exploration. */
export async function generateMascotArtwork(world:Interpretation):Promise<MascotArtwork>{
  const response=await apiFetch('/api/mascot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dna:world.dna,mascot:world.renderSpec.mascot}),signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw new Error('角色生图暂不可用。');
  const data=await response.json();
  if(data.status==='generated'&&typeof data.imageUrl==='string'&&/^\/api\/mascot-art\/[a-f0-9]{64}\.png$/.test(data.imageUrl))return data;
  return {imageUrl:null,status:'unavailable',message:'生图暂不可用，已保留备用装扮。'};
}
