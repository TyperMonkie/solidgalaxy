import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { DemoAccess, allowedOrigin } from '../server/access.ts';

test('Public experience access gates every write path, accepts a signed cookie, and rejects tampering',async()=>{
 const gate=new DemoAccess('fixture-experience-code',true);
 const server=createServer((req,res)=>{void gate.handle(req,res).then(handled=>{if(!handled){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"reached":true}');}});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const request=(path:string,body?:unknown,cookie?:string)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 try{
  assert.equal((await request('/api/social/state')).status,200);
  for(const path of ['/api/profile','/api/compile','/api/mascot','/api/social/search','/api/social/posts','/api/social/world','/api/social/friends'])assert.equal((await request(path,{})).status,401);
  assert.equal((await request('/api/access/unlock',{code:'wrong'})).status,401);
  const unlocked=await request('/api/access/unlock',{code:'fixture-experience-code'});
  assert.equal(unlocked.status,200);const setCookie=unlocked.headers.get('set-cookie')!;
  assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Strict/);
  const cookie=setCookie.split(';')[0];assert.equal((await request('/api/social/posts',{},cookie)).status,200);
  const oldSignature=cookie.at(-1),tampered=cookie.slice(0,-1)+(oldSignature==='a'?'b':'a');
  assert.equal((await request('/api/social/posts',{},tampered)).status,401);
  const otherGate=new DemoAccess('fixture-experience-code',true);
  // A fresh process/session secret cannot accept a prior instance's cookie.
  const otherServer=createServer((req,res)=>{void otherGate.handle(req,res).then(handled=>{if(!handled)res.writeHead(200).end();});});
  await new Promise<void>(r=>otherServer.listen(0,'127.0.0.1',r));
  try{const port=(otherServer.address() as {port:number}).port;assert.equal((await fetch(`http://127.0.0.1:${port}/api/social/posts`,{method:'POST',headers:{cookie}})).status,401);}finally{otherServer.closeAllConnections();await new Promise<void>(r=>otherServer.close(()=>r()));}
  const logout=await request('/api/access/logout',{});assert.match(logout.headers.get('set-cookie')!,/Max-Age=0/);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('Public unlock attempts are bounded and cross-origin requests cannot unlock or mutate',async()=>{
 const gate=new DemoAccess('fixture-experience-code',true);
 const server=createServer((req,res)=>{void gate.handle(req,res).then(handled=>{if(!handled)res.writeHead(200).end();});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  assert.equal((await fetch(base+'/api/access/unlock',{method:'POST',headers:{Origin:'https://untrusted.invalid'},body:JSON.stringify({code:'fixture-experience-code'})})).status,403);
  for(let i=0;i<8;i++)assert.equal((await fetch(base+'/api/access/unlock',{method:'POST',body:'{"code":"wrong"}'})).status,401);
  assert.equal((await fetch(base+'/api/access/unlock',{method:'POST',body:'{"code":"fixture-experience-code"}'})).status,429);
  assert.ok(allowedOrigin('http://127.0.0.1:4173'));assert.equal(allowedOrigin('https://attacker.invalid'),false);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
