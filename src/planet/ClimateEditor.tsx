import { useState } from 'react';
import type { ClimateSpec, LocalWeatherKind, RenderSpec, WeatherRegion } from './RenderSpec.ts';
import { createWeatherRegion, WEATHER_NAMES } from './ClimateField.ts';
import './planet-tuner.css';

const kinds=Object.keys(WEATHER_NAMES) as LocalWeatherKind[];
const sliders:[keyof WeatherRegion,string,number,number,number][]=[
 ['latitude','南北位置',-Math.PI/2,Math.PI/2,.01],['longitude','东西位置',-Math.PI,Math.PI,.01],['radius','覆盖半径（弧度）',.08,.75,.01],['intensity','艺术强度',0,1,.01],['altitude','天气层高度',.08,.5,.005],['opacity','可见浓度',0,1,.01],
 ['speed','独立演化速度',0,3,.01],['windDirection','风向',-Math.PI,Math.PI,.01],['windStrength','风力',0,1,.01],['turbulence','紊流与摇摆',0,1,.01],['particles','雨雪 / 飞散物数量',0,1800,10],['particleSize','雨雪 / 飞散物尺寸',.5,8,.1],['streakLength','雨线 / 光束长度',.005,.12,.001],
 ['cloudCoverage','局部云团份量',0,1,.01],['lightning','雷电频率与亮度',0,1,.01],['vortexTwist','旋涡缠绕圈数',.5,10,.1],['vortexWidth','旋涡宽度',.02,.3,.005],['surfaceInfluence','湿润 / 积雪 / 晴光',0,1,.01],
];
export function ClimateReading({spec,onFocus}:{spec:RenderSpec;onFocus?:(id:string)=>void}){
 const climate=spec.climate;
 return <details className="meaning-details climate-reading"><summary>局部天气 · {climate?.enabled?`${climate.regions.length} 个区域`:'未启用'}</summary>
  {!climate&&<p>旧星球未编排局部天气，可重新编译或手动添加。</p>}
  {climate?.enabled&&climate.regions.map(r=><div className="climate-region-reading" key={r.id}><b>{r.label} · {WEATHER_NAMES[r.kind]}</b><p>{r.meaning}</p><small>半径 {(r.radius*180/Math.PI).toFixed(0)}° · 艺术强度 {Math.round(r.intensity*100)}% · 风力 {Math.round(r.windStrength*100)}%</small>{onFocus&&<button className="pt-open" onClick={()=>onFocus(r.id)}>寻找这片天气 ↗</button>}</div>)}
  <p className="input-note">天气随地表自转，可能在星球背面。艺术天气并非气象预测；晴空、积雪和湿润由局部视觉场表达。</p>
 </details>;
}
export default function ClimateEditor({spec,onChange,onFocus}:{spec:RenderSpec;onChange:(spec:RenderSpec)=>void;onFocus:(id:string)=>void}){
 const climate=spec.climate??{enabled:false,regions:[]},[selected,setSelected]=useState(climate.regions[0]?.id??'');
 const active=climate.regions.find(r=>r.id===selected)??climate.regions[0];
 const change=(next:ClimateSpec)=>onChange({...spec,climate:next});
 const patch=(value:Partial<WeatherRegion>)=>{if(active)change({...climate,regions:climate.regions.map(r=>r.id===active.id?{...r,...value}:r)});};
 function add(kind:LocalWeatherKind){if(climate.regions.length>=5)return;const next=createWeatherRegion(kind,climate.regions.length);change({enabled:true,regions:[...climate.regions,next]});setSelected(next.id);}
 function demo(){const regions=(['storm','snow','tornado','clear'] as const).map((kind,i)=>({...createWeatherRegion(kind,i),latitude:[.48,-.35,.12,-.38][i],longitude:[-.55,.3,.93,-.95][i],radius:kind==='tornado'?.22:.31}));change({enabled:true,regions});setSelected(regions[0].id);}
 return <div className="planet-tuner climate-editor"><div className="pt-eyebrow">LOCAL WEATHER / MAKE IT YOURS</div><h2>一颗星球，<br/>不止一种天气。</h2><p className="pt-lead">AI 从整体故事编排天气。你也可以移动、重塑每片气候；手动修改会明确标记。</p>
  <label className="pt-check"><input type="checkbox" checked={climate.enabled} onChange={e=>change({...climate,enabled:e.target.checked})}/>启用局部天气</label>
  <div className="climate-add">{kinds.map(kind=><button key={kind} disabled={climate.regions.length>=5} onClick={()=>add(kind)}>＋ {WEATHER_NAMES[kind]}</button>)}</div>
  <button className="pt-open" onClick={demo}>试试看：多气候组合（手动预览） ↗</button>
  <p className="input-note">最多 5 片区域。全局薄云与局部天气独立；关闭某一层不会自动删除另一层。</p>
  <div className="climate-region-tabs">{climate.regions.map(r=><button key={r.id} aria-pressed={active?.id===r.id} onClick={()=>{setSelected(r.id);onFocus(r.id);}}>{r.label}</button>)}</div>
  {active&&<>
   <label className="pt-select">区域名字<input aria-label="天气区域名字" maxLength={24} value={active.label} onChange={e=>patch({label:e.target.value||WEATHER_NAMES[active.kind]})}/></label>
   <label className="pt-select">天气形态<select aria-label="天气形态" value={active.kind} onChange={e=>patch({kind:e.target.value as LocalWeatherKind})}>{kinds.map(k=><option value={k} key={k}>{WEATHER_NAMES[k]}</option>)}</select></label>
   <button className="pt-open" onClick={()=>onFocus(active.id)}>把镜头转向这片天气 ↗</button>
   {[['位置与范围',sliders.slice(0,6)],['风、运动与粒子',sliders.slice(6,13)],['云团、旋涡与地表',sliders.slice(13)]] .map(([title,items])=><details open={title==='位置与范围'} key={title as string}><summary>{title as string}</summary>{(items as typeof sliders).map(([key,label,min,max,step])=><label className="pt-slider" key={key}><span>{label}<output>{Number((active[key] as number).toFixed(3))}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={active[key] as number} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>)}</details>)}
   <label className="pt-select">旋涡方向<select aria-label="旋涡方向" value={active.direction} onChange={e=>patch({direction:Number(e.target.value) as -1|1})}><option value={1}>正向</option><option value={-1}>反向</option></select></label>
   {([['color','雨雪 / 晴光颜色'],['cloudColor','局部云团颜色'],['lightningColor','闪电颜色']] as const).map(([key,label])=><label className="pt-color" key={key}>{label}<input aria-label={label} type="color" value={active[key]} onChange={e=>patch({[key]:e.target.value})}/></label>)}
   <p className="input-note">雷电仅用于雷暴，旋涡形态仅用于龙卷风，雨线长度用于降雨和晴光。零强度、零风速、零粒子或静止都可以保留。</p>
   <button className="pt-open" onClick={()=>change({...climate,regions:climate.regions.filter(r=>r.id!==active.id)})}>移除这片天气</button>
  </>}
 </div>;
}
