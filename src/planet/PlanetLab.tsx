import { useEffect, useRef, useState } from 'react';
import PlanetTuner from './PlanetTuner.tsx';
import { PlanetCore } from './PlanetCore.ts';
import { createPreset } from './PlanetPresets.ts';
import { greenheckTerrain, greenheckWeather } from './ProceduralSettings.ts';
export default function PlanetLab(){
 const [spec,setSpec]=useState(()=>{const s=createPreset('nebula',78291);s.terrain=greenheckTerrain();s.weather=greenheckWeather();s.mascot.enabled=false;s.orbits.enabled=false;s.structures.enabled=false;s.modules.clouds=true;s.animation.rotation=.035;return s;});
 const [paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[error,setError]=useState('');
 const host=useRef<HTMLDivElement>(null),core=useRef<PlanetCore|null>(null);
 useEffect(()=>{try{const engine=new PlanetCore(host.current!,spec);core.current=engine;return()=>{engine.dispose();core.current=null;};}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{core.current?.setSpec(spec);core.current?.setPaused(paused);},[spec,paused]);
 return <div className="planet-lab"><header className="pl-header"><a className="brand" href="/">✳ PersonaVerse<span className="brand-dot">®</span></a><nav><span>星球地貌实验室</span><a href="https://dgreenheck.github.io/threejs-procedural-planets/" target="_blank" rel="noreferrer">原作参考 ↗</a><a href="/">返回社交宇宙 ↗</a></nav></header><main className="pl-main"><aside className="pl-sidebar"><PlanetTuner spec={spec} onChange={setSpec}/></aside><section className="pl-stage"><div className="pl-canvas" ref={host}/><div className="pl-title"><small>PERSONAVERSE / WORLD LAB</small><h1>不是换一种颜色。<br/>是另一种生长。</h1><p>同一套程序化地形，连续变化的山脉、大陆和云海。<br/>初始地貌与云参数来自 Greenheck 原作。</p>{error&&<p role="alert">{error}</p>}</div><div className="pl-caption"><span>SEED {spec.seed} · 拖动环视 / 滚轮靠近</span><button onClick={()=>setPaused(p=>!p)}>{paused?'继续演化':'暂停演化'}</button></div></section></main></div>;
}
