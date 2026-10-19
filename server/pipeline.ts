import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DNASchema, ProfileDNASchema, CompilationSchema, ContentSchema, EXPRESSION_MODULES, type UniverseDNA, type UserContent } from '../src/ai/schemas.ts';
import { CAPABILITY_CATALOG } from '../src/ai/capabilities.ts';
import { MODULE_CONSUMERS } from '../src/ai/parameter-contract.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { hashSeed } from '../src/planet/procedural.ts';
import { structuredCall, type ImageInput } from './llm.ts';
const prompt=(name:string)=>readFile(resolve('server','prompts',`${name}.md`),'utf8');
export function sourcePackage(input:UserContent){
 const sources:{id:string;kind:string;content:unknown}[]=[];
 for(const kind of ['posts','interests','music','images','videos','otherComments'] as const){input[kind].forEach((value,i)=>{const content=kind==='images'?{description:(value as UserContent['images'][number]).description,attached:!!(value as UserContent['images'][number]).dataUrl}:value;sources.push({id:`${kind}:${i}`,kind,content});});}
 return {seed:input.seed,creativeVariation:hashSeed(input.seed,17),sources};
}
export function validateDNAIntegrity(dna:UniverseDNA,seed:number,sourceIds?:Set<string>){
 if(dna.seed!==seed)throw new Error('DNA seed changed unexpectedly.');
 if(new Set(dna.directions.map(d=>d.id)).size!==dna.directions.length)throw new Error('Direction IDs must be unique.');
 if(!dna.directions.some(d=>d.id===dna.selectedDirectionId))throw new Error('Selected direction must exist.');
 if(sourceIds)for(const e of [...dna.themes,...dna.contrasts])for(const id of e.evidenceIds)if(!sourceIds.has(id))throw new Error('DNA contains an unknown evidence source ID.');
 return dna;
}
export async function profile(raw:unknown){
 const input=ContentSchema.parse(raw),pack=sourcePackage(input);
 if(!pack.sources.some(s=>typeof s.content==='string'?s.content.trim():s.kind==='images'?(s.content as any).description.trim()||(s.content as any).attached:Object.values(s.content as object).some(Boolean)))throw new Error('Share at least one meaningful fragment.');
 const images:ImageInput[]=input.images.flatMap((i,index)=>i.dataUrl?[{type:'input_text',text:`Attached image source ID: images:${index}`},{type:'input_image',image_url:i.dataUrl,detail:'auto'}] as ImageInput[]:[]);
 const output=await structuredCall('universe_dna',ProfileDNASchema,await prompt('profile-agent'),pack,images);
 validateDNAIntegrity(output.data,input.seed,new Set(pack.sources.map(s=>s.id)));return output;
}
export function compilerInput(dna:UniverseDNA){return {dna,capabilities:CAPABILITY_CATALOG,moduleConsumers:MODULE_CONSUMERS};}
export function validateExpressionCoverage(decisions:{module:string}[]){
 const missing=EXPRESSION_MODULES.filter(module=>!decisions.some(d=>d.module===module));
 if(missing.length)throw new Error(`Invalid expression coverage: missing ${missing.join(', ')}.`);
}
export async function compile(raw:unknown){
 const dna=DNASchema.parse(raw);validateDNAIntegrity(dna,dna.seed);
 const examples=['nebula','fracture','crystal'].map(style=>createPreset(style as 'nebula'|'fracture'|'crystal',dna.seed));
 // Presets are emergency fallbacks only. Shared-seed numeric examples used to
 // anchor every direction to the same weather before interpretation even began.
 const input=compilerInput(dna);
 const instructions=await prompt('style-compiler');
 let validationError='';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const output=await structuredCall('planet_compilation',CompilationSchema,instructions,attempt?{...input,repair:{error:validationError,instruction:'Repair the previous invalid compilation within the supplied schema.'}}:input);
   const renderSpec=validateRenderSpec(output.data.renderSpec);
   validateExpressionCoverage(output.data.decisions);
   if(output.data.renderSpec.seed!==dna.seed||output.data.directionId!==dna.selectedDirectionId)throw new Error('Compiler must preserve DNA seed and selected direction.');
   const family={nebula:'flowing',fracture:'tectonic',crystal:'faceted'}[output.data.renderSpec.style];
   if(output.data.renderSpec.geometry.type!==family)throw new Error('Style and geometry family must agree.');
   if((family==='tectonic')!==!!renderSpec.geometry.fractures)throw new Error('Invalid fracture composition: tectonic requires explicit controls, other families require null.');
   if(!output.data.renderSpec.geometry.enabled)throw new Error('Primary geometry must be enabled.');
   if(!output.data.renderSpec.mascot.enabled)throw new Error('Primary geometry requires the milkfrog mascot.');
   const landmarks=renderSpec.landmarks,knownEvidence=new Set([...dna.themes,...dna.contrasts].flatMap(t=>t.evidenceIds));
   if(new Set(landmarks.map(l=>l.id)).size!==landmarks.length||landmarks.filter(l=>l.placement==='companion').length>3||landmarks.some(l=>l.evidenceIds.some(id=>!knownEvidence.has(id))))throw new Error('Invalid landmark IDs, placement count or evidence.');
   return {...output.data,renderSpec,degraded:false,meta:output.meta};
  }catch(e){if(!(e instanceof Error)||!(/ZodError|RenderSpec/.test(e.name)||/seed|direction|family|geometry|Invalid|Palette|Colors/.test(e.message)))throw e;validationError='Output failed schema or semantic validation. Preserve seed, valid direction, enabled geometry, supported types and numeric ranges. Include one decision for EVERY module: '+EXPRESSION_MODULES.join(', ')+'.';}
 }
 const fallback=examples[Math.floor(hashSeed(dna.seed,33)*examples.length)];
 return {renderSpec:fallback,directionId:dna.selectedDirectionId,interpretation:'The generated configuration could not be validated. Showing a built-in fallback, not a completed personalized rendering.',decisions:[],fallbacks:[{requested:'Personalized visual compilation',substitute:`Built-in ${fallback.style} preset`,reason:'The compiler failed two validation attempts.'}],degraded:true,meta:null};
}
