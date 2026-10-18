import type { SearchResult, SocialState } from './model.ts';
export type StateResponse=SocialState&{meId:string;updating:string[]};
export function localIdentity(){return localStorage.getItem('personaverse-social-identity')||'you';}
export async function socialRequest<T>(path:string,body?:unknown):Promise<T>{const response=await fetch('/api/social/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Personaverse-Profile':localIdentity()},body:body===undefined?undefined:JSON.stringify(body)});const json=await response.json();if(!response.ok)throw new Error(json.error||'操作暂未完成。');return json;}
export const fetchSocial=()=>socialRequest<StateResponse>('state');
export const searchSocial=(query:string)=>socialRequest<SearchResult>('search',{query});
