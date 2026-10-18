import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export function allowedOrigin(origin:string|undefined){
 if(!origin)return true;
 const origins=(process.env.PERSONAVERSE_PUBLIC_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 return origins.includes(origin)||/^http:\/\/(127\.0\.0\.1|localhost):(4173|5173|4183)$/.test(origin);
}
export class DemoAccess {
 private secret=randomBytes(32);private attempts=new Map<string,{count:number;until:number}>();
 constructor(private code:string,private enabled:boolean){if(enabled&&code.length<10)throw new Error('Public demo requires an experience code of at least 10 characters.');}
 private digest(value:string){return createHash('sha256').update(value).digest();}
 private sign(value:string){return createHmac('sha256',this.secret).update(value).digest('hex');}
 private authorized(req:IncomingMessage){
  if(!this.enabled)return true;
  const value=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('pv_demo='))?.slice(8);
  if(!value)return false;
  const [expiry,nonce,signature,...extra]=value.split('.');if(extra.length||!expiry||!nonce||!signature||!/^[a-f0-9]{64}$/.test(signature)||!/^\d{13}$/.test(expiry)||Number(expiry)<=Date.now())return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(this.sign(expiry+'.'+nonce),'hex'));
 }
 /** Runs before every feature API, including social writes and paid search. */
 async handle(req:IncomingMessage,res:ServerResponse){
  const path=new URL(req.url||'/','http://localhost').pathname;
  if(!path.startsWith('/api/'))return false;
  const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(!allowedOrigin(req.headers.origin)){send(403,{error:'不允许的来源。'});return true;}
  if(path==='/api/access/status'&&req.method==='GET'){send(200,{publicDemo:this.enabled,unlocked:this.authorized(req)});return true;}
  if(path==='/api/access/logout'&&req.method==='POST'){res.setHeader('Set-Cookie','pv_demo=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0');send(200,{ok:true});return true;}
  if(path==='/api/access/unlock'&&req.method==='POST'){
   if(!this.enabled){send(200,{ok:true});return true;}
   const forwarded=String(req.headers['cf-connecting-ip']||''),ip=isIP(forwarded)?forwarded:(req.socket.remoteAddress||'unknown'),now=Date.now();
   for(const [key,value]of this.attempts)if(value.until<=now)this.attempts.delete(key);
   const attempt=this.attempts.get(ip)||{count:0,until:now+60000};
   if(attempt.count>=8||this.attempts.size>=2000&&!this.attempts.has(ip)){send(429,{error:'尝试过于频繁，请一分钟后重试。'});return true;}
   attempt.count++;this.attempts.set(ip,attempt);
   let body='';try{for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>1024){send(413,{error:'内容过大。'});return true;}}}catch{send(400,{error:'请求未完成。'});return true;}
   let input:unknown;try{input=JSON.parse(body);}catch{send(400,{error:'请求格式不正确。'});return true;}
   const supplied=typeof input==='object'&&input!==null&&'code' in input&&typeof input.code==='string'?input.code:'';
   if(!timingSafeEqual(this.digest(supplied.trim()),this.digest(this.code))){send(401,{error:'体验码不正确。'});return true;}
   this.attempts.delete(ip);const token=String(now+12*3600000)+'.'+randomBytes(16).toString('hex');
   res.setHeader('Set-Cookie',`pv_demo=${token}.${this.sign(token)}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=43200`);send(200,{ok:true});return true;
  }
  if(this.enabled&&!['GET','HEAD','OPTIONS'].includes(req.method||'GET')&&!this.authorized(req)){send(401,{error:'请先输入体验码解锁互动，再重试本次操作。',code:'DEMO_LOCKED'});return true;}
  return false;
 }
}
export const demoAccess=new DemoAccess(process.env.PERSONAVERSE_DEMO_CODE||'',process.env.PERSONAVERSE_PUBLIC_DEMO==='1');
