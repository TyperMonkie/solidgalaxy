import { z } from 'zod';
import { DNASchema, RenderSpecSchema, RenderReadingSchema, ContentSchema, type UserContent } from '../ai/schemas.ts';
import type { UniverseDNA } from '../ai/schemas.ts';
import type { RenderSpec } from '../planet/RenderSpec.ts';
export const SignatureSchema=z.strictObject({energy:z.number().min(0).max(1),exploration:z.number().min(0).max(1),warmth:z.number().min(0).max(1),summary:z.string().min(1).max(350)});
export type Signature=z.infer<typeof SignatureSchema>;
export interface SocialPost {id:string;authorId:string;text:string;image:string;createdAt:string;likes:string[];}
export interface Resident {id:string;name:string;bio:string;tags:string[];fictional:boolean;signature:Signature;renderSpec:RenderSpec;dna?:UniverseDNA;renderReading?:z.infer<typeof RenderReadingSchema>;mascotArtwork?:string;coordinateStatus?:'pending'|'ready'|'error';worldTitle:string;updatedAt:string;source:'demo'|'ai'|'studio';revision:number;analyzedRevision:number;updateError?:string;}
export interface Friendship {id:string;from:string;to:string;status:'pending'|'accepted'|'declined';createdAt:string;}
export interface SocialState {version:1;demoVisualVersion?:number;residents:Resident[];posts:SocialPost[];friendships:Friendship[];privateSources?:Record<string,UserContent>;}
export interface SearchHit {id:string;reason:string;opener:string;}
export interface SearchResult {hits:SearchHit[];mode:'semantic'|'local';message:string;}
export const PostInputSchema=z.strictObject({text:z.string().trim().max(2000),image:z.string().max(3000000).regex(/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$/)}).refine(v=>!!v.text||!!v.image,{message:'Write something or attach a picture.'});
export const SaveWorldSchema=z.strictObject({dna:DNASchema,renderSpec:RenderSpecSchema,renderReading:RenderReadingSchema.optional(),sourceContent:ContentSchema.optional(),mascotArtwork:z.string().regex(/^\/api\/mascot-art\/[a-f0-9]{64}\.png$/).optional()});
/** Coordinates describe a creative reading, not a psychological measurement. 1 scene unit = 1 LY. */
export function positionFor(r:Pick<Resident,'signature'>):[number,number,number]{const s=r.signature;return [(s.exploration-.5)*64,(s.energy-.5)*24,(s.warmth-.5)*64];}
export function distanceLy(a:Pick<Resident,'signature'>,b:Pick<Resident,'signature'>){const p=positionFor(a),q=positionFor(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);}
export function affinity(a:Pick<Resident,'signature'>,b:Pick<Resident,'signature'>){return Math.round(100*Math.exp(-distanceLy(a,b)/32));}
export function sharedThreads(a:Resident,b:Resident){const common=a.tags.filter(t=>b.tags.includes(t));const axes:[keyof Omit<Signature,'summary'>,string][]=[['energy','表达节奏相近'],['exploration','对新事物的步调相近'],['warmth','相处温度接近']];return [...common,...axes.filter(([axis])=>Math.abs(a.signature[axis]-b.signature[axis])<.17).map(([,label])=>label)].slice(0,3);}
export function openerFor(a:Resident,b:Resident,posts:SocialPost[]){const common=a.tags.find(t=>b.tags.includes(t));const post=posts.find(p=>p.authorId===b.id&&p.text);if(common)return `我也喜欢${common}，最近有让你想分享的一次发现吗？`;if(post)return `看到你写「${post.text.slice(0,36)}${post.text.length>36?'…':''}」，当时是什么让你想记录下来？`;return `你的星球叫「${b.worldTitle}」，这个名字背后有什么小故事？`;}
export function relationship(state:SocialState,me:string,other:string){return state.friendships.find(f=>((f.from===me&&f.to===other)||(f.from===other&&f.to===me))&&f.status==='accepted')||state.friendships.find(f=>((f.from===me&&f.to===other)||(f.from===other&&f.to===me))&&f.status==='pending');}
