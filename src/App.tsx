import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Download, Maximize2, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import Personalization from './Personalization.tsx';
import { compileUniverse, descriptionContent, generateUniverse, type GenerationStage, type Interpretation } from './ai/client.ts';
import { PlanetCore } from './planet/PlanetCore.ts';
import { createPreset } from './planet/PlanetPresets.ts';
import type { UserContent } from './ai/schemas.ts';

export default function App(){
  const [spec,setSpec]=useState(()=>{const preview=createPreset('nebula');preview.modules.clouds=true;preview.animation.rotation=.065;return preview;});
  const [paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [description,setDescription]=useState(''),[result,setResult]=useState<Interpretation|null>(null);
  const [source,setSource]=useState<UserContent|null>(null);
  const [stage,setStage]=useState<GenerationStage|null>(null),[error,setError]=useState(''),[renderError,setRenderError]=useState('');
  const [about,setAbout]=useState(false),[studio,setStudio]=useState(false),[captureMode,setCaptureMode]=useState(false),[toast,setToast]=useState('');
  const [activeTheme,setActiveTheme]=useState(0);
  const host=useRef<HTMLDivElement>(null),core=useRef<PlanetCore|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const busy=stage!==null;
  useEffect(()=>{try{const engine=new PlanetCore(host.current!,spec);core.current=engine;return()=>{engine.dispose();core.current=null;};}catch(e){setRenderError(e instanceof Error?e.message:'WebGL unavailable');}},[]);
  useEffect(()=>{core.current?.setSpec(spec);core.current?.setPaused(paused);},[spec]);
  useEffect(()=>{core.current?.setPaused(paused);},[paused]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select,button'))return;if(e.code==='Space'){e.preventDefault();setPaused(p=>!p);}if(e.key==='Escape')setCaptureMode(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function notify(text:string){setToast(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3000);}
  function apply(next:Interpretation){
    setResult(next);setSpec(next.renderSpec);setActiveTheme(0);setError('');
    setPaused(!next.renderSpec.animation.enabled||matchMedia('(prefers-reduced-motion: reduce)').matches);
    history.replaceState(null,'',location.pathname);
  }
  async function generate(){setStage('profile');setError('');const input={...(source||descriptionContent(description)),posts:[description.trim()],seed:crypto.getRandomValues(new Uint32Array(1))[0]};try{apply(await generateUniverse(input,setStage));setSource(input);notify('你的标签星球已生成');}catch(e){setError(e instanceof Error?e.message:'生成失败，请重试。');}finally{setStage(null);}}
  async function direction(id:string){if(!result||busy||id===result.directionId)return;setStage('compile');setError('');try{apply(await compileUniverse({...result.dna,selectedDirectionId:id}));}catch(e){setError(e instanceof Error?e.message:'视觉生成失败，请重试。');}finally{setStage(null);}}
  function save(){if(!core.current)return;const a=document.createElement('a');a.href=core.current.capture();a.download=`personaverse-${spec.seed}.png`;a.click();notify('已保存当前星球画面');}
  function exportDNA(){if(!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`personaverse-${spec.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const toggle=(key:'atmosphere'|'orbits')=>setSpec(s=>({...s,[key]:{...s[key],enabled:!s[key].enabled}}));
  const theme=result?.dna.themes[activeTheme];
  return <div className={`app identity-app ${captureMode?'capture-mode':''}`} style={{'--accent':spec.material.palette[2]} as React.CSSProperties}>
    <header className="header"><a className="brand" href="/" aria-label="PersonaVerse 首页"><span className="brand-orbit"><i/></span>PersonaVerse<span className="brand-dot">®</span></a><div className="studio-label"><span/>YOUR WORDS <ArrowRight size={11}/> YOUR WORLD</div><nav><button onClick={()=>setAbout(true)}>关于这颗星球 <ArrowUpRight size={13}/></button></nav></header>
    <main className="main">
      <div className="ambient-glow"/>
      <section className="intro identity-intro">
        <div className="eyebrow"><span className="tiny-cross">✳</span> A PLANET THAT SPEAKS OF YOU</div>
        <h1>把你的故事，<br/>变成一颗<em>星球。</em></h1>
        <p>你的偏爱、矛盾与小习惯，<br/>都可以成为这颗星球的语言。</p>
        <label className="description-label" htmlFor="self-description">说说你是怎样的人</label>
        <textarea id="self-description" className="self-description" disabled={busy} value={description} maxLength={10000} onChange={e=>setDescription(e.target.value)} placeholder="比如：我看起来安静，脑子里却很热闹。喜欢雨夜散步，也喜欢在人群里听现场。做事讲究秩序，却总被意外的事吸引……"/>
        <button className="personalize main-generate" disabled={busy||!description.trim()} onClick={()=>void generate()}><Sparkles size={15}/>{stage==='profile'?'正在理解你的描述…':stage==='compile'?'正在构建标签星球…':result?'用修改后的描述重新生成':'生成我的标签星球'}<ArrowRight size={15}/></button>
        <button className="context-link" disabled={busy} onClick={()=>setStudio(true)}>{result?'查看解读 / 补充或修正素材':'还想加入音乐、兴趣或图片'} <ArrowUpRight size={12}/></button>
        <div className="generation-path" aria-live="polite"><span className={stage==='profile'?'current':''}>01 理解描述</span><i/><span className={stage==='compile'?'current':''}>02 提炼视觉语言</span><i/><span>03 生成星球</span></div>
        <p className="input-note">这是对你所分享内容的一种创意解读，你可以随时修正。点击生成后，素材会交给配置的 AI 服务处理。</p>
        {error&&<p className="form-error" role="alert">{error}</p>}
      </section>
      <div className="scene" ref={host}/>
      {renderError&&<div className="render-error"><h2>无法启动 3D 预览</h2><p>{renderError}</p><button onClick={()=>location.reload()}>重试</button></div>}
      <div className="world-heading"><span className="world-number">{result?'YOUR PERSONAL WORLD':'等待你的故事 · 动态示意'}</span><div><span className="live-dot"/>{paused?'已暂停':'LIVE / 持续演化'}</div></div>
      <aside className="identity-inspector">
        {result?<>
          <span className="eyebrow">从描述中生长的标签</span>
          <div className="identity-tags">{result.dna.themes.map((t,i)=><button key={i} aria-pressed={i===activeTheme} onClick={()=>setActiveTheme(i)}>{t.name}</button>)}</div>
          {theme&&<div className="theme-reading"><span>{theme.confidence==='tentative'?'一种可能的联想':'来自你分享的内容'}</span><p>{theme.interpretation}</p></div>}
          <div className="visual-directions"><span className="eyebrow">同一个你，不止一种表达</span>{result.dna.directions.map(d=><button key={d.id} disabled={busy} aria-pressed={d.id===result.directionId} onClick={()=>void direction(d.id)}>{d.name}<ArrowUpRight size={12}/></button>)}</div>
          <details className="meaning-details"><summary>这些标签怎样变成星球？</summary>{result.decisions.map((d,i)=><p key={i}><b>{d.intent}</b>{d.implementation}</p>)}<p>{result.dna.uncertainty}</p></details>
          {result.degraded&&<p className="form-error">个性化视觉配置未通过校验，当前显示备用示意星球。</p>}
          {result.fallbacks.length>0&&<details className="meaning-details"><summary>当前画面的表达折衷</summary>{result.fallbacks.map((f,i)=><p key={i}>{f.requested} → {f.substitute}。{f.reason}</p>)}</details>}
        </>:<div className="empty-reading"><span className="eyebrow">你的视觉化标签</span><span className="empty-orbit">✳</span><h3>先认识你，<br/>再生成你的世界。</h3><p>输入描述后，AI 会寻找其中的情绪、偏爱和矛盾，组合成一颗有自己气质的动态星球。</p><small>眼前是效果示意，尚未解读你的性格。</small></div>}
        <div className="living-layers"><span className="eyebrow">让世界流动</span>{([
          ['自转',!paused,()=>setPaused(p=>!p)],
          ['表面流雾',spec.modules.clouds,()=>setSpec(s=>({...s,modules:{...s.modules,clouds:!s.modules.clouds}}))],
          ['环绕星带',spec.orbits.enabled,()=>toggle('orbits')],
          ['大气辉光',spec.atmosphere.enabled,()=>toggle('atmosphere')]
        ] as [string,boolean,()=>void][]).map(([label,on,action])=><button key={label} className="module" aria-pressed={on} onClick={action}><span>{label}</span><i className={`switch ${on?'on':''}`}><b/></i></button>)}</div>
      </aside>
      <div className="planet-caption"><span className="caption-line"/><div><span className="caption-tag">{result?'YOUR UNIVERSE DNA':'EVERY WORLD STARTS WITH A STORY'}</span><h2>{result?.dna.title||'你的故事，还未抵达'}</h2><p>{result?result.interpretation:'流动的雾、自转的地表、缓缓游移的星带。\n当你分享自己，它们才开始拥有属于你的含义。'}</p></div></div>
      <div className="scene-tools"><button onClick={()=>setPaused(p=>!p)} aria-label={paused?'继续动态':'暂停动态'}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button onClick={()=>core.current?.resetView()} aria-label="重置视角"><RotateCcw size={15}/></button><span/><button onClick={()=>setCaptureMode(p=>!p)} aria-label="沉浸查看"><Maximize2 size={15}/></button></div>
      <div className="interaction-hint"><span className="mouse-icon"/> 拖动环视 <b>·</b> 滚动靠近</div>
      <button className="exit-capture" onClick={()=>setCaptureMode(false)}><X size={15}/> 返回</button>
    </main>
    <footer><span className="footer-thought">人无法被几个词定义，但可以拥有自己的宇宙。</span><div className="footer-actions">{result&&<button className="capture-button" onClick={exportDNA}>保存星球 DNA</button>}<button className="capture-button" onClick={save}><Download size={14}/>保存画面</button></div></footer>
    {toast&&<div className="toast" role="status"><Check size={15}/>{toast}</div>}
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="关闭" onClick={()=>setAbout(false)}><X size={18}/></button><span className="eyebrow">THE PERSONAVERSE IDEA</span><h2>从你的描述，生长出一个世界。</h2><p>第一阶段综合理解你分享的内容，提炼情绪氛围、兴趣、矛盾与富有想象力的标签，形成 Universe DNA。第二阶段将这些含义翻译成可执行的地表、配色、大气、星带和运动配置。</p><p>标签是可修正的创意理解，不是性格诊断。内部的几何模块只是画笔，每个人的故事决定如何组合它们。当前渲染器的能力仍有限，无法实现的想象会标明视觉折衷。</p><div className="pipeline-mini">你的描述 <ArrowRight size={12}/> 标签与 DNA <ArrowRight size={12}/> 动态星球</div></section></div>}
    {studio&&<Personalization initialContent={description} initialSource={source} initialResult={result} onClose={()=>setStudio(false)} onApply={(next,content)=>{setSource(content);setDescription(content.posts.join('\n'));apply(next);setStudio(false);notify('星球已更新');}}/>}
  </div>;
}
