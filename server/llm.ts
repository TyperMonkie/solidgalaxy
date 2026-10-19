import { z } from 'zod';
import { loadProviderConfig } from './config.ts';
export class ProviderError extends Error {constructor(message:string,public status=502){super(message);}}
export type ImageInput={type:'input_image';image_url:string;detail:'auto'}|{type:'input_text';text:string};
/** Responses JSON Schema contract. Credentials and provider bodies never go to the client. */
export async function structuredCall<T>(name:string,schema:z.ZodType<T>,instructions:string,input:unknown,images:ImageInput[]=[],timeoutMs=120000){
 const config=await loadProviderConfig();
 const jsonSchema=z.toJSONSchema(schema);delete (jsonSchema as any).$schema;
 let response:Response;
 try{response=await fetch(`${config.baseUrl}/responses`,{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,store:false,instructions,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(input)},...images]}],text:{format:{type:'json_schema',name,strict:true,schema:jsonSchema}},max_output_tokens:name==='universe_dna'||name==='planet_compilation'?11000:6500}),signal:AbortSignal.timeout(timeoutMs)});}catch{throw new ProviderError('AI provider connection failed or timed out. Please try again.');}
 if(!response.ok){await response.text();throw new ProviderError(`AI provider returned HTTP ${response.status} for ${config.model}. Check model access and Responses/JSON Schema support.`,response.status===401||response.status===403?503:502);}
 const result=await response.json() as any;
 if(result.status&&result.status!=='completed')throw new ProviderError(`AI response did not complete (${result.status}).`);
 const parts=(result.output||[]).flatMap((o:any)=>o.type==='message'?(o.content||[]):[]);
 if(parts.some((p:any)=>p.type==='refusal'))throw new ProviderError('The model declined to interpret this input.',422);
 const output=typeof result.output_text==='string'?result.output_text:parts.filter((p:any)=>p.type==='output_text').map((p:any)=>p.text).join('');
 if(!output)throw new ProviderError('AI provider returned no structured text.');
 let parsed:unknown;try{parsed=JSON.parse(output);}catch{throw new ProviderError('AI provider returned invalid JSON.');}
 return {data:schema.parse(parsed),meta:{model:config.model,responseId:typeof result.id==='string'?result.id:null,usage:result.usage||null}};
}
