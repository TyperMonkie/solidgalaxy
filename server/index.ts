import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { api } from './api.ts';
const root=resolve('dist');
createServer(async(req,res)=>{
 try{
  if(await api(req,res))return;
  const file=resolve(root,'.'+decodeURIComponent(new URL(req.url||'/', 'http://127.0.0.1').pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const target=await stat(file).then(s=>s.isFile()?file:resolve(root,'index.html')).catch(()=>resolve(root,'index.html'));
  const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
  res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'});res.end(await readFile(target));
 }catch{res.writeHead(500).end('Server error.');}
}).listen(4173,'127.0.0.1',()=>console.log('PersonaVerse: http://127.0.0.1:4173'));
