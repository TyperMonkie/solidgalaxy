import { useEffect, useRef, useState } from 'react';
import ClimateEditor from './ClimateEditor.tsx';
import { PlanetCore } from './PlanetCore.ts';
import { createPreset } from './PlanetPresets.ts';
import { createWeatherRegion, WEATHER_NAMES } from './ClimateField.ts';
import { greenheckTerrain } from './ProceduralSettings.ts';
import type { LocalWeatherKind, RenderSpec } from './RenderSpec.ts';

function example(kind?:LocalWeatherKind):RenderSpec{
 const s=createPreset('nebula',513721);s.terrain={...greenheckTerrain(),relief:.045,colors:['#102C43','#2E6272','#8FAD94','#C4BA97','#E5DDCC']};s.structures.enabled=false;s.orbits.enabled=false;s.modules.clouds=false;s.modules.stars=true;s.animation.rotation=.022;s.background!.starCount=650;s.background!.color='#02050B';s.background!.planets=[];s.lighting={enabled:true,intensity:1.05,ambient:.14,specular:.2,shininess:12,direction:[-.65,.55,.6],color:'#FFF6EA'};s.bloom={threshold:.9,strength:.1,radius:.35};s.atmosphere={...s.atmosphere,color:'#97C7E5',strength:.18};s.mascot.scale=.72;s.mascot.latitude=.1;s.mascot.longitude=-.8;
 const regions=(kind?[kind]:['storm','snow','tornado','clear'] as LocalWeatherKind[]).map((k,i)=>({...createWeatherRegion(k,i),id:`lab-${k}`,latitude:kind ? .35 : [.48,-.35,.12,-.38][i],longitude:kind ? .05 : [-.55,.3,.93,-.95][i],radius:k==='tornado'?.26:.34,intensity:.85,altitude:k==='tornado'?.4:.3,surfaceInfluence:.45,meaning:'受控效果演示，可自由修改；不是从个人素材生成的性格解读。'}));
 s.climate={enabled:true,regions};return s;
}
export default function WeatherLab(){
 const [spec,setSpec]=useState(()=>example()),[paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[error,setError]=useState('');
 const host=useRef<HTMLDivElement>(null),core=useRef<PlanetCore|null>(null);
 useEffect(()=>{try{const engine=new PlanetCore(host.current!,spec);core.current=engine;return()=>{engine.dispose();core.current=null;};}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{core.current?.setSpec(spec);core.current?.setPaused(paused||!spec.animation.enabled);},[spec,paused]);
 return <div className="planet-lab"><header className="pl-header"><a className="brand" href="/">✳ PersonaVerse<span className="brand-dot">®</span></a><nav><span>局部天气实验室 · 演示配置</span><a href="/?studio=1">进入个性工作室 ↗</a><a href="/">返回社交宇宙 ↗</a></nav></header><main className="pl-main"><aside className="pl-sidebar"><div className="climate-add"><button onClick={()=>setSpec(example())}>多气候组合</button>{(Object.keys(WEATHER_NAMES) as LocalWeatherKind[]).map(k=><button key={k} onClick={()=>setSpec(example(k))}>演示{WEATHER_NAMES[k]}</button>)}</div><ClimateEditor spec={spec} onChange={setSpec} onFocus={id=>core.current?.focusWeather(id)}/></aside><section className="pl-stage"><div className="pl-canvas" ref={host}/><div className="pl-title"><small>PERSONAVERSE / LOCAL WEATHER</small><h1>这一面，下着雨。<br/>另一面，正在放晴。</h1><p>球面上的局部雨雪、旋涡、雷光与晴空。<br/>此页为效果演示；个人星球由你的故事编排天气。</p>{error&&<p role="alert">{error}</p>}</div><div className="pl-caption"><span>拖动环视 · 点击区域名寻找天气 · 所有修改仅为预览</span><button onClick={()=>setPaused(p=>!p)}>{paused?'继续演化':'暂停演化'}</button></div></section></main></div>;
}
