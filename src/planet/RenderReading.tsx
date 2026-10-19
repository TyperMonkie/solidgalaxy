import type { Interpretation } from '../ai/client.ts';
import { EXPRESSION_MODULES } from '../ai/schemas.ts';
import { parameterRows, type ExpressionModule } from '../ai/parameter-contract.ts';
import type { RenderSpec } from './RenderSpec.ts';

const labels:Record<ExpressionModule,string>={geometry:'地形与裂缝',material:'材质与发光',weather:'云层与风',atmosphere:'大气与轮廓',orbits:'星环与星尘',structures:'表面构筑物',lighting:'光照与高光',bloom:'辉光',animation:'自转与运动',mascot:'奶蛙形象与姿态',landmarks:'标签与空间分布',background:'个人星空背景'};
export default function RenderReading({spec,result,manual}:{spec:RenderSpec;result:Interpretation|null;manual:boolean}){
 const rows=parameterRows(spec),direction=result?.dna.directions.find(d=>d.id===result.directionId);
 return <details className="meaning-details render-reading"><summary>完整视觉编排 · 12 个模块 / {rows.filter(r=>r.module).length} 项配置</summary>
  <p>{manual?'当前包含手动修改，生成依据描述的是原 AI 方案。':result?'每组参数共同表达整体解读；关闭某个视觉层也是选择。':'当前是示例配置，尚无个性化依据。'}</p>
  {EXPRESSION_MODULES.map(module=><details key={module}><summary>{labels[module]}</summary><p>{direction?.artIntents?.[module==='geometry'?'surface':module]}</p>{result?.decisions.filter(d=>d.module===module).map((d,i)=><p key={i}><b>{d.intent}</b>{d.implementation}</p>)}{!result?.decisions.some(d=>d.module===module)&&<p>未留存此模块的生成依据，可重新编译。</p>}<dl>{rows.filter(r=>r.module===module).map(r=><div key={r.path}><dt>{r.path}</dt><dd>{JSON.stringify(r.value)}</dd></div>)}</dl></details>)}
  <p className="input-note">版本、种子及设备画质属于技术设置。模块关闭时会保留其参数；旧配置缺失的字段会使用明确的兼容值。数学算法、着色器和安全绘制预算仍由引擎实现。</p>
 </details>;
}
