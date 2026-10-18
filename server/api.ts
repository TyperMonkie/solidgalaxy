import type { IncomingMessage, ServerResponse } from 'node:http';
import { ContentSchema, DNASchema } from '../src/ai/schemas.ts';
import { CAPABILITY_CATALOG } from '../src/ai/capabilities.ts';
import { compile, profile } from './pipeline.ts';
import { ProviderError } from './llm.ts';
import { generateMascot, MascotRequestSchema, readMascotArt } from './mascot.ts';
const MAX_BODY=9*1024*1024;
let active=0;
export async function api(req:IncomingMessage,res:ServerResponse){
 const path=req.url?.split('?')[0];if(!path?.startsWith('/api/'))return false;
 const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(req.method==='GET'&&path==='/api/health'){send(200,{status:'ready',model:process.env.PERSONAVERSE_MODEL||'gpt-6-sol',capabilityVersion:1});return true;}
 if(req.method==='GET'&&path==='/api/capabilities'){send(200,CAPABILITY_CATALOG);return true;}
 if(req.method==='GET'&&path.startsWith('/api/mascot-art/')){const image=await readMascotArt(path);if(!image){send(404,{error:'Mascot image was not found.'});return true;}res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'});res.end(image);return true;}
 if(req.method!=='POST'||!['/api/profile','/api/compile','/api/universe','/api/mascot'].includes(path)){send(404,{error:'Unknown API route.'});return true;}
 if(req.headers.origin&&!['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4173','http://localhost:4173'].includes(req.headers.origin)){send(403,{error:'Origin is not allowed.'});return true;}
 if(path==='/api/mascot'){
  try{
   const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){send(413,{error:'Input exceeds the 9 MB limit.'});return true;}chunks.push(Buffer.from(chunk));}
   let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'Request must contain valid JSON.'});return true;}
   MascotRequestSchema.parse(input);send(200,await generateMascot(input));
  }catch(e){if(e instanceof Error&&e.name==='ZodError')send(422,{error:'Mascot input does not match the required schema.'});else send(200,{imageUrl:null,status:'unavailable',message:'专属形象暂不可用，已保留原有奶蛙装扮。'});}
  return true;
 }
 if(active>=2){send(429,{error:'Two interpretations are already running. Please try again shortly.'});return true;}
 active++;
 try{
  const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){send(413,{error:'Input exceeds the 9 MB limit.'});return true;}chunks.push(Buffer.from(chunk));}
  let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'Request must contain valid JSON.'});return true;}
  if(path==='/api/profile'){ContentSchema.parse(input);const result=await profile(input);send(200,{dna:result.data,meta:result.meta});}
  else if(path==='/api/compile'){DNASchema.parse(input);send(200,await compile(input));}
  else{ContentSchema.parse(input);const interpretation=await profile(input);const compilation=await compile(interpretation.data);send(200,{dna:interpretation.data,...compilation,profileMeta:interpretation.meta});}
 }catch(e){if(e instanceof ProviderError)send(e.status,{error:e.message});else if(e instanceof Error&&e.name==='ZodError')send(422,{error:'Input or model output does not match the required schema.'});else send(400,{error:'Interpretation could not be validated. Check the input and server configuration.'});}
 finally{active--;}
 return true;
}
