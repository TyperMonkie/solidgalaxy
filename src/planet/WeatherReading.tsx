import type { RenderSpec } from './RenderSpec.ts';
import { cloudReadout } from './CloudReadout.ts';

export default function WeatherReading({spec,meaning}:{spec:RenderSpec;meaning?:string}){
 const w=cloudReadout(spec),n=(v:number)=>Number(v.toFixed(3));
 return <details className="meaning-details weather-reading"><summary>云层依据与实际参数 · {w.enabled?'有云':'无云'}</summary>
  <p>{meaning||'这颗星球没有留存云层编排依据，不能据此判断它为何有云。'}</p>
  {w.legacy&&<p className="form-error">旧版配置未保存天气对象，当前使用兼容默认值。重新编译后才能得到完整的个性化天气。</p>}
  <dl><div><dt>噪声密度偏移</dt><dd>{n(w.density)}</dd></div><div><dt>单片不透明度</dt><dd>{n(w.opacity)}</dd></div><div><dt>云团尺度</dt><dd>{n(w.scale)}</dd></div><div><dt>高度 / 厚度</dt><dd>{n(w.altitude)} / {n(w.thickness)}</dd></div><div><dt>粒径范围</dt><dd>{n(w.minSize)}–{n(w.maxSize)}</dd></div><div><dt>实际 / 配置粒子数</dt><dd>{w.renderedParticles} / {w.requestedParticles}</dd></div><div><dt>演化 / 风速</dt><dd>{n(w.speed)} / {n(w.drift)}</dd></div></dl>
  <p className="input-note">密度不是覆盖百分比。云量由密度、透明度、粒径和数量共同决定；低画质最多绘制 1800 个粒子。</p>
 </details>;
}
