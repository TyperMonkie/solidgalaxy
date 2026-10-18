import { ContentSchema, type UserContent } from './schemas.ts';
export interface StoryDraft {
 description:string; posts:string[]; interests:string[];
 music:{title:string;artist:string}[];
 images:{name:string;description:string;dataUrl:string}[];
 imageDescription:string;video:string;comments:string;
}
export const emptyDraft=():StoryDraft=>({description:'',posts:[''],interests:[],music:[{title:'',artist:''}],images:[],imageDescription:'',video:'',comments:''});
export const exampleDraft=():StoryDraft=>({description:'【虚构示例】平时话不多，一到现场就变得很热闹。喜欢自由，也会认真照顾朋友。希望自己的世界有摇滚的能量，但别太拥挤。',posts:['自由的风吹到哪里，不用告诉我，我自己去看。'],interests:['摇滚','吉他','旅行'],music:[{title:'Sweet Child O’ Mine',artist:'Guns N’ Roses'},{title:'We Will Rock You',artist:'Queen'}],images:[],imageDescription:'',video:'',comments:''});
export function draftToContent(d:StoryDraft,seed:number):UserContent {
 return ContentSchema.parse({posts:[d.description,...d.posts].map(s=>s.trim()).filter(Boolean),interests:d.interests,music:d.music.filter(m=>m.title.trim()||m.artist.trim()).map(m=>({...m,metadata:''})),images:d.images.length?d.images.map(i=>({description:i.description||d.imageDescription,dataUrl:i.dataUrl})):d.imageDescription.trim()?[{description:d.imageDescription,dataUrl:''}]:[],videos:d.video.trim()?[{title:'',caption:d.video,tags:[]}]:[],otherComments:d.comments.trim()?[d.comments]:[],seed});
}
export function draftCount(d:StoryDraft){return [Number(!!d.description.trim())+d.posts.filter(s=>s.trim()).length,d.interests.length+d.music.filter(m=>m.title.trim()||m.artist.trim()).length,d.images.length+Number(!!d.imageDescription.trim())+Number(!!d.video.trim())+Number(!!d.comments.trim())];}
