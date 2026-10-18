import type { RenderSpec, TerrainSpec, WeatherSpec } from './RenderSpec.ts';
import { greenheckTerrain, greenheckWeather, proceduralSettings, terrainSettings, weatherSettings } from './ProceduralSettings.ts';
import './planet-tuner.css';
type Props={spec:RenderSpec;onChange:(spec:RenderSpec)=>void};
function Slider({label,value,min,max,step=.01,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void}){
 return <label className="pt-slider"><span>{label}<output>{Number(value.toFixed(3))}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
/** All controls use the same validated specification as the AI compiler. */
export default function PlanetTuner({spec:s,onChange}:Props){
 const t=terrainSettings(s),w=weatherSettings(s);
 const terrain=(patch:Partial<TerrainSpec>)=>onChange({...s,terrain:{...t,...patch}});
 const weather=(patch:Partial<WeatherSpec>)=>onChange({...s,weather:{...w,...patch}});
 const random=(all:boolean)=>{const next=proceduralSettings(crypto.getRandomValues(new Uint32Array(1))[0]);onChange({...s,terrain:{...next.terrain,...(!all?{colors:t.colors}:{})},...(all?{weather:next.weather,material:{...s.material,palette:[next.terrain.colors[0],next.terrain.colors[1],next.terrain.colors[4]]}}:{})});};
 return <div className="planet-tuner">
  <div className="pt-eyebrow">PROCEDURAL / CONTINUOUS</div><h2>让世界，自由生长。</h2><p className="pt-lead">拖动滑杆，实时改变地貌和天气。<br/>同一种颜色，也能长出不同的大陆。</p>
  <div className="pt-random"><button onClick={()=>random(false)}>↻ 仅随机地貌</button><button onClick={()=>random(true)}>✳ 自由生成</button></div>
  <button className="pt-reference" onClick={()=>onChange({...s,style:'nebula',geometry:{...s.geometry,type:'flowing',fractures:null},terrain:greenheckTerrain(),weather:greenheckWeather(),modules:{...s.modules,clouds:true}})}>使用 Greenheck 原作地貌与云参数 ↗</button>
  <details open><summary>01 / 地形与大陆</summary>
   <label className="pt-select">噪声算法<select aria-label="噪声算法" value={t.noise} onChange={e=>terrain({noise:e.target.value as TerrainSpec['noise']})}><option value="simplex">Simplex · 岛屿与平原</option><option value="fractal">Fractal · 多尺度大陆</option><option value="ridged">Ridged · 褶皱与山脉</option></select></label>
   <Slider label="地形幅度" value={t.amplitude} min={.1} max={1.5} onChange={amplitude=>terrain({amplitude})}/>
   <Slider label="山脉锐度" value={t.sharpness} min={.1} max={5} onChange={sharpness=>terrain({sharpness})}/>
   <Slider label="海陆偏移" value={t.offset} min={-1} max={1} onChange={offset=>terrain({offset})}/>
   <Slider label="大陆尺度" value={t.period} min={.1} max={2} onChange={period=>terrain({period})}/>
   <Slider label="轮廓起伏" value={t.relief} min={0} max={.16} step={.001} onChange={relief=>terrain({relief})}/>
   <Slider label="细节持续度" value={t.persistence} min={.1} max={1} onChange={persistence=>terrain({persistence})}/>
   <Slider label="细节频率" value={t.lacunarity} min={1} max={3} onChange={lacunarity=>terrain({lacunarity})}/>
   <Slider label="地形层数" value={t.octaves} min={1} max={10} step={1} onChange={octaves=>terrain({octaves})}/>
   <Slider label="凹凸强度" value={t.bumpStrength} min={0} max={1} onChange={bumpStrength=>terrain({bumpStrength})}/>
   <Slider label="凹凸采样距离" value={t.bumpOffset} min={.0001} max={.02} step={.0001} onChange={bumpOffset=>terrain({bumpOffset})}/>
  </details>
  <details open><summary>02 / 云海与天气</summary>
   <label className="pt-check"><input type="checkbox" checked={s.modules.clouds} onChange={e=>onChange({...s,modules:{...s.modules,clouds:e.target.checked}})}/>显示云层</label>
   <Slider label="云雾浓淡" value={w.density} min={-1} max={1} onChange={density=>weather({density})}/>
   <Slider label="云层透明度" value={w.opacity} min={0} max={1} onChange={opacity=>weather({opacity})}/>
   <Slider label="云团尺度" value={w.scale} min={.05} max={1.5} onChange={scale=>weather({scale})}/>
   <Slider label="云层高度" value={w.altitude} min={.015} max={.3} step={.005} onChange={altitude=>weather({altitude})}/>
   <Slider label="云层厚度" value={w.thickness} min={.005} max={.25} step={.005} onChange={thickness=>weather({thickness})}/>
   <Slider label="云团柔软尺寸" value={w.size} min={10} max={160} step={1} onChange={size=>weather({size})}/>
   <Slider label="云层采样数量" value={w.particles} min={500} max={8000} step={100} onChange={particles=>weather({particles})}/>
   <Slider label="天气演化速度" value={w.speed} min={0} max={.1} step={.001} onChange={speed=>weather({speed})}/>
   <Slider label="风向与漂移" value={w.drift} min={-.1} max={.1} step={.001} onChange={drift=>weather({drift})}/>
   <label className="pt-color">云的颜色<input aria-label="云的颜色" type="color" value={w.color} onChange={e=>weather({color:e.target.value})}/></label>
  </details>
  <details><summary>03 / 五层海拔配色</summary><p className="pt-note">从低洼到山顶。分界控制色层出现的高度，融合控制过渡宽度。</p>
   {t.colors.map((c,i)=><div className="pt-band" key={i}><label className="pt-color">第 {i+1} 层<input aria-label={`第${i+1}层颜色`} type="color" value={c} onChange={e=>terrain({colors:t.colors.map((v,j)=>j===i?e.target.value:v) as TerrainSpec['colors']})}/></label>{i>0&&<><Slider label={`第${i+1}层分界`} value={t.transitions[i-1]} min={0} max={3} onChange={v=>terrain({transitions:t.transitions.map((n,j)=>j===i-1?v:n) as TerrainSpec['transitions']})}/><Slider label={`第${i+1}层融合`} value={t.blends[i-1]} min={0} max={1} onChange={v=>terrain({blends:t.blends.map((n,j)=>j===i-1?v:n) as TerrainSpec['blends']})}/></>}</div>)}
  </details>
  <details><summary>04 / 运动与空间</summary>
   <Slider label="星球自转" value={s.animation.rotation} min={0} max={.2} step={.001} onChange={rotation=>onChange({...s,animation:{...s.animation,rotation}})}/>
   <Slider label="大气辉光" value={s.atmosphere.strength} min={0} max={1.5} onChange={strength=>onChange({...s,atmosphere:{...s.atmosphere,strength}})}/>
   <label className="pt-check"><input type="checkbox" checked={s.orbits.enabled} onChange={e=>onChange({...s,orbits:{...s.orbits,enabled:e.target.checked}})}/>显示星环</label>
  </details>
  <p className="pt-credit">地形与云算法改编自 <a href="https://github.com/dgreenheck/threejs-procedural-planets" target="_blank" rel="noreferrer">Daniel Greenheck ↗</a> · MIT<br/>参数保存于星球 DNA；云为原作精灵云，并非光线步进体积云。</p>
 </div>;
}
