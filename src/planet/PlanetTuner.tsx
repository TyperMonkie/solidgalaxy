import type { RenderSpec, TerrainSpec, WeatherSpec, LightingSpec, BloomSpec, OrbitSpec } from './RenderSpec.ts';
import { greenheckTerrain, greenheckWeather, greenheckLighting, greenheckBloom, proceduralSettings, terrainSettings, weatherSettings, lightingSettings, orbitSettings, bloomSettings } from './ProceduralSettings.ts';
import './planet-tuner.css';
type Props={spec:RenderSpec;onChange:(spec:RenderSpec)=>void};
function Slider({label,value,min,max,step=.01,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void}){
 return <label className="pt-slider"><span>{label}<output>{Number(value.toFixed(3))}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
/** All controls use the same validated specification as the AI compiler. */
export default function PlanetTuner({spec:s,onChange}:Props){
 const t=terrainSettings(s),w=weatherSettings(s),l=lightingSettings(s),o=orbitSettings(s),b=bloomSettings(s);
 const terrain=(patch:Partial<TerrainSpec>)=>onChange({...s,terrain:{...t,...patch}});
 const weather=(patch:Partial<WeatherSpec>)=>onChange({...s,weather:{...w,...patch}});
 const lighting=(patch:Partial<LightingSpec>)=>onChange({...s,lighting:{...l,...patch}});
 const orbit=(patch:Partial<OrbitSpec>)=>onChange({...s,orbits:{...o,...patch}});
 const bloom=(patch:Partial<BloomSpec>)=>onChange({...s,bloom:{...b,...patch}});
 const random=(all:boolean)=>{const next=proceduralSettings(crypto.getRandomValues(new Uint32Array(1))[0]);onChange({...s,terrain:{...next.terrain,...(!all?{colors:t.colors}:{})},...(all?{weather:next.weather,material:{...s.material,palette:[next.terrain.colors[0],next.terrain.colors[1],next.terrain.colors[4]]}}:{})});};
 return <div className="planet-tuner">
  <div className="pt-eyebrow">RENDER SPEC / PERSONAL WORLD</div><h2>让世界，自由生长。</h2><p className="pt-lead">生成时，这些参数由 AI 综合你的故事决定。<br/>这里可以查看并手动微调；修改会随星球保存。</p>
  <div className="pt-random"><button onClick={()=>random(false)}>↻ 仅随机地貌</button><button onClick={()=>random(true)}>✳ 自由生成</button></div>
  <button className="pt-reference" onClick={()=>onChange({...s,style:'nebula',geometry:{...s.geometry,type:'flowing',fractures:null},terrain:greenheckTerrain(),weather:greenheckWeather(),lighting:greenheckLighting(),bloom:greenheckBloom(),modules:{...s.modules,clouds:true,postFX:true}})}>预览 Greenheck 原作参数 ↗</button>
  <details open><summary>01 / 地形与大陆</summary>
   <label className="pt-select">噪声算法<select aria-label="噪声算法" value={t.noise} onChange={e=>terrain({noise:e.target.value as TerrainSpec['noise']})}><option value="simplex">Simplex · 岛屿与平原</option><option value="fractal">Fractal · 多尺度大陆</option><option value="ridged">Ridged · 褶皱与山脉</option></select></label>
   <Slider label="地形幅度" value={t.amplitude} min={.1} max={1.5} onChange={amplitude=>terrain({amplitude})}/>
   <Slider label="山脉锐度" value={t.sharpness} min={0} max={5} onChange={sharpness=>terrain({sharpness})}/>
   <Slider label="海陆偏移" value={t.offset} min={-2} max={2} onChange={offset=>terrain({offset})}/>
   <Slider label="大陆尺度" value={t.period} min={.1} max={2} onChange={period=>terrain({period})}/>
   <Slider label="轮廓起伏" value={t.relief} min={0} max={.16} step={.001} onChange={relief=>terrain({relief})}/>
   <Slider label="细节持续度" value={t.persistence} min={0} max={1} onChange={persistence=>terrain({persistence})}/>
   <Slider label="细节频率" value={t.lacunarity} min={1} max={3} onChange={lacunarity=>terrain({lacunarity})}/>
   <Slider label="地形层数" value={t.octaves} min={1} max={10} step={1} onChange={octaves=>terrain({octaves})}/>
   <Slider label="凹凸强度" value={t.bumpStrength} min={0} max={1} onChange={bumpStrength=>terrain({bumpStrength})}/>
   <Slider label="凹凸采样距离" value={t.bumpOffset} min={.0001} max={.1} step={.0001} onChange={bumpOffset=>terrain({bumpOffset})}/>
   {s.geometry.fractures&&<>{(['density','branching','directionality','distortion','width','coverage','depth'] as const).map((key,i)=><Slider key={key} label={['裂缝密度','裂缝分支','裂缝方向性','裂缝扭曲','裂缝宽度','裂缝覆盖','裂缝深度'][i]} value={s.geometry.fractures![key]} min={0} max={1} onChange={v=>onChange({...s,geometry:{...s.geometry,fractures:{...s.geometry.fractures!,[key]:v}}})}/>)}</>}
  </details>
  <details open><summary>02 / 云海与天气</summary>
   <label className="pt-check"><input type="checkbox" checked={s.modules.clouds} onChange={e=>onChange({...s,modules:{...s.modules,clouds:e.target.checked}})}/>显示云层</label>
   <Slider label="云雾浓淡" value={w.density} min={-2} max={2} onChange={density=>weather({density})}/>
   <Slider label="云层透明度" value={w.opacity} min={0} max={1} onChange={opacity=>weather({opacity})}/>
   <Slider label="云团尺度" value={w.scale} min={.05} max={1.5} onChange={scale=>weather({scale})}/>
   <Slider label="云层高度" value={w.altitude} min={.015} max={.3} step={.005} onChange={altitude=>weather({altitude})}/>
   <Slider label="云层厚度" value={w.thickness} min={.005} max={.25} step={.005} onChange={thickness=>weather({thickness})}/>
   <Slider label="最小云粒子尺寸" value={w.minParticleSize} min={0} max={200} step={1} onChange={minParticleSize=>weather({minParticleSize,maxParticleSize:Math.max(minParticleSize,w.maxParticleSize)})}/>
   <Slider label="最大云粒子尺寸" value={w.maxParticleSize} min={0} max={200} step={1} onChange={maxParticleSize=>weather({maxParticleSize,minParticleSize:Math.min(maxParticleSize,w.minParticleSize)})}/>
   <Slider label="云层采样数量" value={w.particles} min={1} max={50000} step={1} onChange={particles=>weather({particles})}/>
   <Slider label="天气演化速度" value={w.speed} min={0} max={.1} step={.001} onChange={speed=>weather({speed})}/>
   <Slider label="风向与漂移" value={w.drift} min={-.1} max={.1} step={.001} onChange={drift=>weather({drift})}/>
   <label className="pt-color">云的颜色<input aria-label="云的颜色" type="color" value={w.color} onChange={e=>weather({color:e.target.value})}/></label>
  </details>
  <details><summary>03 / 五层海拔配色</summary><p className="pt-note">从低洼到山顶。分界控制色层出现的高度，融合控制过渡宽度。</p>
   {t.colors.map((c,i)=><div className="pt-band" key={i}><label className="pt-color">第 {i+1} 层<input aria-label={`第${i+1}层颜色`} type="color" value={c} onChange={e=>terrain({colors:t.colors.map((v,j)=>j===i?e.target.value:v) as TerrainSpec['colors']})}/></label>{i>0&&<><Slider label={`第${i+1}层分界`} value={t.transitions[i-1]} min={0} max={3} onChange={v=>terrain({transitions:t.transitions.map((n,j)=>j===i-1?v:n) as TerrainSpec['transitions']})}/><Slider label={`第${i+1}层融合`} value={t.blends[i-1]} min={0} max={1} onChange={v=>terrain({blends:t.blends.map((n,j)=>j===i-1?v:n) as TerrainSpec['blends']})}/></>}</div>)}
  </details>
  <details><summary>04 / 星环的形态与轨道</summary>
   <label className="pt-check"><input type="checkbox" checked={o.enabled} onChange={e=>orbit({enabled:e.target.checked})}/>显示星环</label>
   <label className="pt-select">星环构成<select aria-label="星环构成" value={o.type} onChange={e=>orbit({type:e.target.value as OrbitSpec['type']})}><option value="ribbons">流光丝带</option><option value="dust">纯点云</option><option value="broken">断裂弧带</option><option value="angular">多边形环</option></select></label>
   {([
    ['radius','星环半径',1.2,3,.01],['width','星环宽度',.002,.6,.002],['layers','星环层数',1,16,1],['arc','弧长',.1,Math.PI*2,.01],['eccentricity','椭圆偏心率',0,.8,.01],['warp','飘带起伏',0,.3,.005],['particles','星尘数量',0,20000,100],['particleSize','星尘尺寸',0,8,.1],['opacity','星环透明度',0,1,.01],['tilt','画面倾角',-1.5,1.5,.01],['inclination','轨道倾角',-Math.PI,Math.PI,.01],['speed','独立环绕速度',-.3,.3,.001],['precession','轨道进动速度',0,.3,.001]
   ] as const).map(([key,label,min,max,step])=><Slider key={key} label={label} value={o[key]} min={min} max={max} step={step} onChange={v=>orbit({[key]:v})}/>)}
   {o.colors.map((c,i)=><label className="pt-color" key={i}>星环颜色 {i+1}<input aria-label={`星环颜色${i+1}`} type="color" value={c} onChange={e=>orbit({colors:o.colors.map((v,j)=>i===j?e.target.value:v) as [string,string]})}/></label>)}
  </details>
  <details><summary>05 / 光照与高光</summary>
   <label className="pt-check"><input type="checkbox" checked={l.enabled} onChange={e=>lighting({enabled:e.target.checked})}/>启用定向光</label>
   {([['ambient','环境光',0,5],['intensity','漫反射',0,5],['specular','高光强度',0,5],['shininess','高光锐度',0,25]] as const).map(([key,label,min,max])=><Slider key={key} label={label} value={l[key]} min={min} max={max} onChange={v=>lighting({[key]:v})}/>)}
   {l.direction.map((v,i)=><Slider key={i} label={`光源方向 ${'XYZ'[i]}`} value={v} min={-1} max={1} onChange={n=>{const direction=l.direction.map((x,j)=>i===j?n:x) as [number,number,number];if(Math.hypot(...direction)>=.001)lighting({direction});}}/>)}
   <label className="pt-color">光的颜色<input aria-label="光的颜色" type="color" value={l.color} onChange={e=>lighting({color:e.target.value})}/></label>
   <Slider label="表面粗糙度" value={s.material.roughness} min={.05} max={1} onChange={roughness=>onChange({...s,material:{...s.material,roughness}})}/>
   <Slider label="金属感" value={s.material.metalness} min={0} max={1} onChange={metalness=>onChange({...s,material:{...s.material,metalness}})}/>
   <Slider label="裂缝自发光" value={s.material.emission} min={0} max={2} onChange={emission=>onChange({...s,material:{...s.material,emission}})}/>
  </details>
  <details><summary>06 / 辉光与运动</summary>
   <label className="pt-check"><input type="checkbox" checked={s.modules.postFX} onChange={e=>onChange({...s,modules:{...s.modules,postFX:e.target.checked}})}/>Bloom 辉光</label>
   {([['threshold','辉光阈值',1],['strength','辉光强度',1],['radius','辉光半径',2]] as const).map(([key,label,max])=><Slider key={key} label={label} value={b[key]} min={0} max={max} onChange={v=>bloom({[key]:v})}/>)}
   <label className="pt-check"><input type="checkbox" checked={s.animation.enabled} onChange={e=>onChange({...s,animation:{...s.animation,enabled:e.target.checked}})}/>世界动态</label>
   <Slider label="星球自转" value={s.animation.rotation} min={0} max={.2} step={.001} onChange={rotation=>onChange({...s,animation:{...s.animation,rotation}})}/>
   <Slider label="表面与丝带流动" value={s.animation.flow} min={0} max={1} onChange={flow=>onChange({...s,animation:{...s.animation,flow}})}/>
   <label className="pt-check"><input type="checkbox" checked={s.atmosphere.enabled} onChange={e=>onChange({...s,atmosphere:{...s.atmosphere,enabled:e.target.checked}})}/>大气边缘光</label>
   <Slider label="大气辉光" value={s.atmosphere.strength} min={0} max={1.5} onChange={strength=>onChange({...s,atmosphere:{...s.atmosphere,strength}})}/>
   <label className="pt-color">大气颜色<input aria-label="大气颜色" type="color" value={s.atmosphere.color} onChange={e=>onChange({...s,atmosphere:{...s.atmosphere,color:e.target.value}})}/></label>
  </details>
  <p className="pt-credit">地形与云算法改编自 <a href="https://github.com/dgreenheck/threejs-procedural-planets" target="_blank" rel="noreferrer">Daniel Greenheck ↗</a> · MIT<br/>参数保存于星球 DNA；云为原作精灵云，并非光线步进体积云。</p>
 </div>;
}
