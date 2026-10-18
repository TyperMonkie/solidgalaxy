import { createPreset } from '../planet/PlanetPresets.ts';
import { Color, SRGBColorSpace } from 'three';
import type { SocialState, Resident } from './model.ts';
const DEMO_VISUAL_VERSION=2;
function demoRenderSpec(i:number,energy:number,exploration:number,color:string){
 const renderSpec=createPreset(i%3===0?'nebula':i%3===1?'crystal':'fracture',900071+i*271);
 const hsl=new Color(color).getHSL({h:0,s:0,l:0},SRGBColorSpace);
 const tint=(s:number,l:number)=>'#'+new Color().setHSL(hsl.h,s,l,SRGBColorSpace).getHexString();
 // Three distinct luminance roles: pastel-on-pastel erased the terrain detail.
 renderSpec.material.palette=[tint(.5,.055),tint(Math.max(.44,hsl.s),.27+energy*.06),tint(.46,.72)];
 renderSpec.geometry.complexity=.25+exploration*.65;
 renderSpec.geometry.displacement=.06+energy*.24;
 renderSpec.orbits.type=(['ribbons','broken','dust','angular'] as const)[i%4];
 renderSpec.atmosphere.color=tint(.5,.6);
 renderSpec.modules.clouds=energy<.65;
 renderSpec.animation.rotation=.025+energy*.07;
 renderSpec.mascot.enabled=false;renderSpec.landmarks=[];
 return renderSpec;
}
const characters:[string,string,string,string[],number,number,number,string,string][]=[
 ['you','未命名旅人','我喜欢有温度的相遇，也想去看看不一样的世界。',['音乐','散步','好奇心'],.52,.55,.65,'#8fcbbc','给相遇一点引力'],
 ['morrow','晚风来信','慢热但认真，喜欢听完一个人的故事再开口。',['温柔','阅读','散步'],.20,.35,.90,'#d3c39c','把月光留给你'],
 ['echo','失真回声','在演出现场大声合唱，在回家路上慢慢整理自己。',['摇滚','吉他','自由'],.91,.79,.53,'#efa065','今晚不设返程'],
 ['moss','苔原','用镜头收集细微的绿色，周末想在山里走得久一点。',['摄影','自然','温柔'],.31,.65,.84,'#a8cf9e','万物缓慢生长'],
 ['io','Io / 白噪','喜欢电子乐、奇怪的建筑和独处，偶尔也想共享一段沉默。',['电子乐','建筑','独处'],.42,.88,.24,'#afa5ef','留白有回声'],
 ['tangerine','橘子汽水','热情是会传染的！想把城市里好吃好玩的都分享给朋友。',['美食','热情','音乐'],.86,.67,.94,'#f3bb77','把太阳分给你'],
 ['lune','月球邮差','喜欢读诗、记录梦，也喜欢耐心倾听那些说不出口的话。',['温柔','诗歌','阅读'],.15,.40,.94,'#c3c6ee','梦在这里靠岸'],
 ['atlas','无名公路','今天出发就好，喜欢攀登、旅行和路边的陌生故事。',['旅行','户外','自由'],.88,.97,.61,'#d8a679','路的尽头还有路'],
 ['pixel','像素游民','做小游戏、看科幻，把奇怪的想法先做出来再说。',['游戏','科幻','创作'],.70,.91,.45,'#85cbd4','想象力越界'],
 ['tea','半杯热茶','给日常留一点空白。做饭、看书，和朋友待着也可以不用说话。',['温柔','阅读','美食'],.24,.26,.85,'#bccba1','慢一点也很好'],
 ['vinyl','午夜唱片','把唱片放到第二面，最喜欢的是一首歌结束后的安静。',['音乐','独处','摄影'],.33,.53,.48,'#b6a1cc','下一首是你'],
 ['kite','追风筝的人','新朋友、新城市、新体验，生活需要一些临时起意。',['旅行','热情','好奇心'],.94,.90,.83,'#e2a9b5','向未知发送信号'],
 ['tidal','潮汐研究员','喜欢海边和天文，用一点理性保护珍贵的浪漫。',['天文','自然','科幻'],.37,.77,.62,'#81b4d6','向宇宙借一片海'],
 ['iris','虹之间','画画、编故事，向往安静但不单调的生活。',['创作','诗歌','温柔'],.40,.58,.81,'#d5b2d1','不必只有一种颜色'],
 ['ember','余烬俱乐部','热爱篮球和现场，不怕冲突，但希望每个人都被接住。',['运动','摇滚','热情'],.98,.70,.74,'#d48178','热烈也有边界'],
 ['north','北极星','先观察，再决定。喜欢秩序、建筑与长时间的专注。',['建筑','独处','阅读'],.18,.47,.25,'#a6b6c7','秩序里的远方'],
 ['sol','日落制造所','旅行时不赶景点，只想找个地方看一场完整的日落。',['旅行','摄影','散步'],.46,.71,.76,'#e4b78e','再等一场日落'],
 ['orbit','环形笔记','不太会寒暄，但对喜欢的事物可以聊上整晚。',['科幻','游戏','音乐'],.55,.62,.41,'#a6a1df','为共鸣留一席'],
 ];
export function seedSocialState():SocialState{
 const now=Date.now();const residents:Resident[]=characters.map(([id,name,bio,tags,energy,exploration,warmth,color,title],i)=>{const renderSpec=demoRenderSpec(i,energy,exploration,color);return {id,name,bio,tags,fictional:id!=='you',signature:{energy,exploration,warmth,summary:bio},renderSpec,worldTitle:title,updatedAt:new Date(now).toISOString(),source:'demo',revision:0,analyzedRevision:0};});
 const words:Record<string,string[]>={you:['第一次把自己的小世界，放进更大的宇宙。你好，路过的人。'],morrow:['今天散步时听完了朋友一个很长的故事。能被认真听见，也是一种拥抱。','书店的灯很暖，买了一本没有计划要买的书。'],echo:['昨晚现场所有人一起唱副歌的时候，突然觉得自己没有那么孤单。','新学的吉他和弦还会按错，但先录下来再说。'],moss:['山路上碰见一束很小的光。拍照之前，先站着看了一会儿。'],lune:['如果今天有点累，就把想说的话留到明天吧。月亮不会催你。'],tea:['煮了一锅番茄汤。朋友说好喝，今天就已经很值得。'],atlas:['在没有信号的地方，反而听清楚了自己在想什么。'],io:['路过一栋很奇怪的楼，窗户的排列像一首没有鼓点的电子乐。'],tangerine:['朋友们！发现一家会把橘子皮做成糖的店，下次一起去！'],pixel:['给小游戏加了一个会迷路的NPC。突然觉得它很像我。'],kite:['买了明天出发的车票。目的地先保密，回来再告诉你们。']};
 const posts=residents.flatMap((r,i)=>(words[r.id]||[`${r.bio} 今天也在自己的轨道上，等待一次刚刚好的相遇。`]).map((text,k)=>({id:`demo-${r.id}-${k}`,authorId:r.id,text,image:'',createdAt:new Date(now-(i*3+k*19+1)*3600000).toISOString(),likes:[]})));
 return {version:1,demoVisualVersion:DEMO_VISUAL_VERSION,residents,posts,friendships:[]};
}
/** Upgrade old demo artwork once; never replace AI/studio worlds or social data. */
export function upgradeDemoVisuals(state:SocialState){
 if((state.demoVisualVersion??0)>=DEMO_VISUAL_VERSION)return false;
 for(const resident of state.residents){
  if(resident.source!=='demo')continue;
  const i=characters.findIndex(c=>c[0]===resident.id);
  if(i<0)continue;
  const character=characters[i];
  resident.renderSpec=demoRenderSpec(i,character[4],character[5],character[7]);
 }
 state.demoVisualVersion=DEMO_VISUAL_VERSION;return true;
}
