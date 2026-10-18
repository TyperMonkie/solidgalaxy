import { loadProviderConfig } from './config.ts';
import { z } from 'zod';
import { DNASchema } from '../src/ai/schemas.ts';
const c=await loadProviderConfig();
const schema=z.toJSONSchema(DNASchema);delete (schema as any).$schema;
const res=await fetch(c.baseUrl+'/responses',{method:'POST',headers:{Authorization:`Bearer ${c.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:c.model,input:'Generate a fictional planet DNA with seed 1.',text:{format:{type:'json_schema',name:'dna',strict:true,schema}},max_output_tokens:2048,store:false}),signal:AbortSignal.timeout(60000)});
const value=await res.json() as any;
console.log(JSON.stringify({status:res.status,error:value.error?{code:value.error.code,message:String(value.error.message||'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,1200)}:null,output:value.output?.filter((v:any)=>v.type==='message').flatMap((m:any)=>m.content?.map((v:any)=>v.text))}));
