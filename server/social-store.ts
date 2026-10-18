import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedSocialState, upgradeDemoVisuals } from '../src/social/seed.ts';
import type { SocialState } from '../src/social/model.ts';
export class SocialStore{
 private tail:Promise<unknown>=Promise.resolve();
 constructor(private path=resolve(process.env.PERSONAVERSE_SOCIAL_STORE||'.local/social-universe.json')){}
 private async load():Promise<SocialState>{try{const state=JSON.parse(await readFile(this.path,'utf8'));if(state.version!==1||!Array.isArray(state.residents)||!Array.isArray(state.posts)||!Array.isArray(state.friendships))throw new Error('Invalid local social store.');if(upgradeDemoVisuals(state))await this.save(state);return state;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;const state=seedSocialState();await this.save(state);return state;}}
 private async save(state:SocialState){await mkdir(dirname(this.path),{recursive:true});const temporary=this.path+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(state),'utf8');await rename(temporary,this.path);}
 read(){return this.run(()=>this.load());}
 mutate<T>(fn:(state:SocialState)=>T|Promise<T>){return this.run(async()=>{const state=await this.load(),result=await fn(state);await this.save(state);return result;});}
 private run<T>(job:()=>Promise<T>):Promise<T>{const work=this.tail.then(job);this.tail=work.catch(()=>{});return work;}
}
export const socialStore=new SocialStore();
