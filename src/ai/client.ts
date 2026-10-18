import { CompilationSchema, DNASchema, type UniverseDNA, type UserContent } from './schemas.ts';
import { validateRenderSpec, type RenderSpec } from '../planet/RenderSpec.ts';

export interface Interpretation {
  dna: UniverseDNA; renderSpec: RenderSpec; directionId: string; interpretation: string;
  decisions: {intent:string;module:string;implementation:string}[];
  fallbacks: {requested:string;substitute:string;reason:string}[]; degraded: boolean;
}
export type GenerationStage = 'profile' | 'compile';
async function request(path:string,input:unknown){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
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
  return compileUniverse(dna);
}
