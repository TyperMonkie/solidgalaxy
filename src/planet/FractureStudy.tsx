import { useEffect, useRef, useState } from 'react';
import { PlanetCore } from './PlanetCore.ts';
import { createPreset } from './PlanetPresets.ts';
import { fractureForSeed } from './FractureField.ts';
import type { FractureSpec } from './RenderSpec.ts';

const studies:{title:string;caption:string;shape:FractureSpec}[]=[
 {title:'留白中的伤痕',caption:'少量大区域 · 局部覆盖 · 细浅刻痕',shape:{density:.05,branching:.03,directionality:.12,distortion:.2,width:.2,coverage:.32,depth:.25}},
 {title:'偏向一侧的河流',caption:'定向拉伸 · 弯曲分流 · 宽窄交错',shape:{density:.32,branching:.92,directionality:.9,distortion:.82,width:.65,coverage:.85,depth:.6}},
 {title:'破碎的大陆',caption:'不规则板块 · 多区域连接 · 较深沟壑',shape:{density:.96,branching:.12,directionality:.08,distortion:.63,width:.7,coverage:1,depth:.85}},
];
function StudyPlanet({shape,seed}:{shape:FractureSpec;seed:number}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const s=createPreset('fracture',seed);s.geometry.fractures=shape;s.geometry.displacement=.24;
  delete s.terrain; // Controlled legacy fracture comparison retains its fixed palette.
  s.material={palette:['#11191f','#607476','#ffbc79'],roughness:.82,metalness:.1,emission:.75};
  s.orbits.enabled=false;s.structures.enabled=false;s.modules.clouds=false;s.modules.postFX=false;s.mascot.enabled=false;
  s.atmosphere.strength=.16;s.animation.rotation=.025;
  const engine=new PlanetCore(host.current!,s);engine.comparisonPose();engine.camera.position.set(0,.1,4.6);engine.controls.update();
  const element=host.current!;
  engine.onStats=stats=>{element.dataset.camera=JSON.stringify({position:engine.camera.position.toArray(),fov:engine.camera.fov,aspect:engine.camera.aspect,triangles:stats.triangles});};
  return ()=>engine.dispose();
 },[shape,seed]);
 return <div className="fracture-study-planet" ref={host}/>;
}
/** Controlled visual comparison: all three use the same palette, seed and camera. */
export default function FractureStudy(){
 const [seed,setSeed]=useState(901426),[random,setRandom]=useState(false);
 const shapes=useRef<{seed:number;values:FractureSpec[]}>({seed:0,values:[]});
 if(shapes.current.seed!==seed)shapes.current={seed,values:studies.map((_,i)=>fractureForSeed(seed+i*613))};
 return <main className="fracture-study">
  <style>{`
   .fracture-study{min-height:100vh;background:#03070c;color:#e6edeb;padding:52px 48px;font-family:Arial,sans-serif;box-sizing:border-box}
   .fracture-study header{display:flex;align-items:end;justify-content:space-between;gap:30px}
   .fracture-study small{font-size:10px;letter-spacing:3px;color:#91b2b4}.fracture-study h1{font-size:40px;font-weight:400;margin:18px 0}.fracture-study p{font-size:13px;color:#9aabad;line-height:1.8}
   .fracture-study button,.fracture-study a{background:transparent;border:1px solid #334145;color:#dae5e2;padding:11px 16px;border-radius:8px;text-decoration:none;font-size:12px;cursor:pointer}
   .fracture-study-controls{display:flex;gap:10px;flex-wrap:wrap}.fracture-study-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:34px}
   .fracture-study article{background:#060b12;border:1px solid #1a2830;border-radius:18px;overflow:hidden}.fracture-study-planet{height:430px;position:relative}.fracture-study-planet canvas{display:block;width:100%;height:100%}
   .fracture-study article section{padding:0 24px 20px}.fracture-study h2{font-size:20px;font-weight:400;margin:8px 0}.fracture-study footer{margin-top:26px;color:#728589;font-size:12px}
  `}</style>
  <header><div><small>PERSONAVERSE / CONTINUOUS TERRAIN</small><h1>同一颗种子，不同的生长。</h1><p>相同配色、镜头和种子。只改变裂缝结构，直接比较差异。以下是连续参数空间中的三个样本。</p></div>
   <div className="fracture-study-controls"><button onClick={()=>setSeed(crypto.getRandomValues(new Uint32Array(1))[0])}>换一个随机种子</button><button onClick={()=>setRandom(v=>!v)}>{random?'回到对照样本':'自由随机组合'}</button><a href="/">返回社交宇宙 ↗</a></div></header>
  <div className="fracture-study-grid">{studies.map((study,i)=><article key={i}><StudyPlanet shape={random?shapes.current.values[i]:study.shape} seed={seed}/><section><small>0{i+1} / {random?'SEEDED VARIATION':'SAME SEED, DIFFERENT MORPHOLOGY'}</small><h2>{random?`随机生长 ${i+1}`:study.title}</h2><p>{random?'独立组合疏密、分叉、方向、弯曲、宽度、覆盖和深度。':study.caption}</p></section></article>)}</div>
  <footer>SEED {seed} · 拖动各颗星球查看背面。这里没有调用 AI；用于验证渲染器本身的结构变化。生成流程中的 AI 已可选择同样的参数。</footer>
 </main>;
}
