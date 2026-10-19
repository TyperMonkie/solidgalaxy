import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Download, Maximize2, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import StoryComposer from './StoryComposer.tsx';
import { draftCount, draftToContent, emptyDraft } from './ai/draft.ts';
import { compileUniverse, generateUniverse, generateMascotArtwork, type GenerationStage, type Interpretation } from './ai/client.ts';
import { PlanetCore } from './planet/PlanetCore.ts';
import { createPreset } from './planet/PlanetPresets.ts';
import { paintMascotPortrait } from './planet/PlanetMascot.ts';
import { validateRenderSpec, type LandmarkSpec, type MascotSpec } from './planet/RenderSpec.ts';
import { LANDMARK_GLYPHS } from './planet/PlanetLandmarks.ts';
import { DNASchema } from './ai/schemas.ts';
import type { Resident } from './social/model.ts';
import PlanetTuner from './planet/PlanetTuner.tsx';

export default function App({initialWorld,onBack,onPublish}:{initialWorld?:Resident;onBack?:()=>void;onPublish?:(world:Interpretation)=>Promise<void>}={}){
  const [spec,setSpec]=useState(()=>{if(initialWorld)return initialWorld.renderSpec;const preview=createPreset('nebula');preview.modules.clouds=true;preview.animation.rotation=.065;preview.animation.flow=.65;return preview;});
  const [paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [draft,setDraft]=useState(()=>({...emptyDraft(),description:initialWorld?.bio||'',interests:initialWorld?.source==='demo'?initialWorld.tags:[]})),[result,setResult]=useState<Interpretation|null>(()=>initialWorld?.dna?{dna:initialWorld.dna,renderSpec:initialWorld.renderSpec,directionId:initialWorld.dna.selectedDirectionId,interpretation:initialWorld.dna.vision,decisions:[],fallbacks:[],degraded:false,...(initialWorld.mascotArtwork?{mascotArtwork:{imageUrl:initialWorld.mascotArtwork,status:'generated' as const,message:''}}:{})}:null);
  const [publishing,setPublishing]=useState(false);
  const [stage,setStage]=useState<GenerationStage|null>(null),[error,setError]=useState(''),[renderError,setRenderError]=useState('');
  const [about,setAbout]=useState(false),[studio,setStudio]=useState(false),[captureMode,setCaptureMode]=useState(false),[toast,setToast]=useState('');
  const [activeTheme,setActiveTheme]=useState(0);
  const [tuning,setTuning]=useState(false);
  const [selectedLandmark,setSelectedLandmark]=useState<LandmarkSpec|null>(null);
  const [mascotArtwork,setMascotArtwork]=useState<string|null>(initialWorld?.mascotArtwork||null),[artStage,setArtStage]=useState<'idle'|'drawing'|'generated'|'unavailable'>(initialWorld?.mascotArtwork?'generated':'idle');
  const artSequence=useRef(0);
  const host=useRef<HTMLDivElement>(null),core=useRef<PlanetCore|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const busy=stage!==null;
  useEffect(()=>{try{const engine=new PlanetCore(host.current!,spec);engine.onMascotSelect=()=>setStudio(true);engine.onLandmarkSelect=setSelectedLandmark;core.current=engine;return()=>{engine.dispose();core.current=null;};}catch(e){setRenderError(e instanceof Error?e.message:'WebGL unavailable');}},[]);
  useEffect(()=>{core.current?.setSpec(spec);core.current?.setPaused(paused);},[spec]);
  useEffect(()=>{core.current?.setMascotArtwork(mascotArtwork);},[mascotArtwork]);
  useEffect(()=>{core.current?.setPaused(paused);},[paused]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select,button'))return;if(e.code==='Space'){e.preventDefault();setPaused(p=>!p);}if(e.key==='Escape')setCaptureMode(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function notify(text:string){setToast(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3000);}
  function apply(next:Interpretation){
    artSequence.current++;const savedArt=next.mascotArtwork?.imageUrl;
    setMascotArtwork(savedArt&&/^\/api\/mascot-art\/[a-f0-9]{64}\.png$/.test(savedArt)?savedArt:null);setArtStage(savedArt?'generated':'idle');
    setResult(next);setSpec(next.renderSpec);setActiveTheme(0);setError('');
    setPaused(!next.renderSpec.animation.enabled||matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  async function drawMascot(world:Interpretation){const sequence=++artSequence.current;setArtStage('drawing');try{const artwork=await generateMascotArtwork(world);if(sequence!==artSequence.current)return;setMascotArtwork(artwork.imageUrl);setArtStage(artwork.status);setResult(current=>current?{...current,mascotArtwork:artwork}:current);}catch{if(sequence===artSequence.current)setArtStage('unavailable');}}
  async function generate(){setStage('profile');setError('');try{const input=draftToContent(draft,crypto.getRandomValues(new Uint32Array(1))[0]);const world=await generateUniverse(input,setStage);apply(world);void drawMascot(world);notify('星球已生成，正在绘制你的专属角色');}catch(e){setError(e instanceof Error?e.message:'生成失败，请重试。');}finally{setStage(null);}}
  async function direction(id:string){if(!result||busy||id===result.directionId)return;setStage('compile');setError('');try{const world=await compileUniverse({...result.dna,selectedDirectionId:id});apply(world);void drawMascot(world);}catch(e){setError(e instanceof Error?e.message:'视觉生成失败，请重试。');}finally{setStage(null);}}
  function save(){if(!core.current)return;const a=document.createElement('a');a.href=core.current.capture();a.download=`personaverse-${spec.seed}.png`;a.click();notify('已保存当前星球画面');}
  function exportDNA(){if(!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify({...result,renderSpec:spec},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`personaverse-${spec.seed}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importDNA(file:File|undefined){if(!file)return;try{if(file.size>1024*1024)throw new Error('DNA 文件不能超过 1 MB。');const saved=JSON.parse(await file.text());const dna=DNASchema.parse(saved.dna),renderSpec=validateRenderSpec(saved.renderSpec);if(dna.seed!==renderSpec.seed)throw new Error('DNA 与画面标识不一致。');apply({...saved,dna,renderSpec});notify('已恢复保存的宇宙');}catch{setError('无法导入这份 DNA，请使用当前版本导出的 JSON。');}}
  const toggle=(key:'atmosphere'|'orbits')=>setSpec(s=>({...s,[key]:{...s[key],enabled:!s[key].enabled}}));
  const theme=result?.dna.themes[activeTheme];
  return <div className={`app identity-app ${captureMode?'capture-mode':''}`} style={{'--accent':spec.material.palette[2]} as React.CSSProperties}>
    <header className="header"><a className="brand" href="/" aria-label="PersonaVerse 首页"><span className="brand-orbit"><i/></span>PersonaVerse<span className="brand-dot">®</span></a><div className="studio-label"><span/>YOUR WORDS <ArrowRight size={11}/> YOUR WORLD</div><nav>{onBack&&<button onClick={onBack}>返回社交宇宙 <ArrowUpRight size={13}/></button>}{onPublish&&<button disabled={!result||result.degraded||busy||publishing} onClick={async()=>{if(!result)return;setPublishing(true);try{await onPublish({...result,renderSpec:spec});}catch(e){setError((e as Error).message);}finally{setPublishing(false);}}}>{publishing?'正在发布…':'发布到宇宙'} <ArrowRight size={13}/></button>}<button onClick={()=>setAbout(true)}>关于这颗星球 <ArrowUpRight size={13}/></button></nav></header>
    <main className="main">
      <div className="ambient-glow"/>
      <section className="intro identity-intro">
        <div className="eyebrow"><span className="tiny-cross">✳</span> A PLANET THAT SPEAKS OF YOU</div>
        <h1>你的故事，<br/>一颗<em>星球。</em>一只奶蛙。</h1>
        <p>把偏爱交给奶蛙，把气质留给宇宙。</p>
        <StoryComposer draft={draft} onChange={setDraft} disabled={busy}/>
        <button className="personalize main-generate" disabled={busy||!draftCount(draft).some(Boolean)} onClick={()=>void generate()}><Sparkles size={15}/>{stage==='profile'?'正在理解你的故事…':stage==='compile'?'正在编排星球与奶蛙…':result?'重新生成我的宇宙':'生成我的宇宙'}<ArrowRight size={15}/></button>
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
          {spec.landmarks.length>0&&<div className="world-symbols"><span className="eyebrow">星球上的 {spec.landmarks.length} 个小发现</span><div>{spec.landmarks.map(item=><button key={item.id} onClick={()=>{core.current?.focusLandmark(item.id);setSelectedLandmark(item);}}><span>{LANDMARK_GLYPHS[item.icon]}</span>{item.label}</button>)}</div><small>旋转寻找，点选读懂它们。</small></div>}
          {result.degraded&&<p className="form-error">个性化视觉配置未通过校验，当前显示备用示意星球。</p>}
          {result.fallbacks.length>0&&<details className="meaning-details"><summary>当前画面的表达折衷</summary>{result.fallbacks.map((f,i)=><p key={i}>{f.requested} → {f.substitute}。{f.reason}</p>)}</details>}
        </>:<div className="empty-reading"><span className="eyebrow">你的视觉化标签</span><span className="empty-orbit">✳</span><h3>先认识你，<br/>再生成你的世界。</h3><p>输入描述后，AI 会寻找其中的情绪、偏爱和矛盾，组合成一颗有自己气质的动态星球。</p><small>眼前是效果示意，尚未解读你的性格。</small></div>}
        <button className="pt-open" onClick={()=>setTuning(true)}>✳ 自定义地貌、云海与天气 ↗</button>
        <div className="living-layers"><span className="eyebrow">让世界流动</span>{([
          ['自转',!paused,()=>setPaused(p=>!p)],
          ['蓬松云层',spec.modules.clouds,()=>setSpec(s=>({...s,modules:{...s.modules,clouds:!s.modules.clouds}}))],
          ['环绕星带',spec.orbits.enabled,()=>toggle('orbits')],
          ['大气辉光',spec.atmosphere.enabled,()=>toggle('atmosphere')]
        ] as [string,boolean,()=>void][]).map(([label,on,action])=><button key={label} className="module" aria-pressed={on} onClick={action}><span>{label}</span><i className={`switch ${on?'on':''}`}><b/></i></button>)}</div>
        <div className="orbit-choices"><span>星环的另一种表达</span><div>{(['ribbons','dust'] as const).map(type=><button key={type} aria-pressed={spec.orbits.enabled&&spec.orbits.type===type} onClick={()=>setSpec(s=>({...s,orbits:{...s.orbits,enabled:true,type}}))}>{type==='ribbons'?'流光丝带':'星尘点轨'}</button>)}</div></div>
        <button className="frog-about" onClick={()=>setStudio(true)}>✳ 认识这只奶蛙 <ArrowUpRight size={12}/></button>
        {artStage!=='idle'&&<p className="mascot-image-status" role="status">{artStage==='drawing'?'正在绘制独特形象，星球可以继续探索…':artStage==='generated'?'专属形象已落在你的星球上':'生图暂不可用，当前保留备用装扮。'}</p>}
      </aside>
      {tuning&&<aside className="pt-drawer" aria-label="星球地貌与天气编辑器"><button className="pt-drawer-close" aria-label="关闭地貌编辑器" onClick={()=>setTuning(false)}>×</button><PlanetTuner spec={spec} onChange={setSpec}/></aside>}
      <div className="planet-caption"><span className="caption-line"/><div><span className="caption-tag">{result?'YOUR UNIVERSE DNA':'EVERY WORLD STARTS WITH A STORY'}</span><h2>{result?.dna.title||'你的故事，还未抵达'}</h2><p>{result?result.interpretation:'流动的雾、自转的地表、缓缓游移的星带。\n当你分享自己，它们才开始拥有属于你的含义。'}</p></div></div>
      <div className="scene-tools"><button onClick={()=>setPaused(p=>!p)} aria-label={paused?'继续动态':'暂停动态'}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button onClick={()=>core.current?.resetView()} aria-label="重置视角"><RotateCcw size={15}/></button><button onClick={()=>core.current?.focusMascot()} aria-label="找到奶蛙" title="找到奶蛙"><Sparkles size={15}/></button><span/><button onClick={()=>setCaptureMode(p=>!p)} aria-label="沉浸查看"><Maximize2 size={15}/></button></div>
      <div className="interaction-hint"><span className="mouse-icon"/> 拖动环视 <b>·</b> 滚动靠近</div>
      <button className="exit-capture" onClick={()=>setCaptureMode(false)}><X size={15}/> 返回</button>
    </main>
    <footer><span className="footer-thought">人无法被几个词定义，但可以拥有自己的宇宙。</span><div className="footer-actions"><label className="capture-button import-dna">导入 DNA<input type="file" aria-label="导入星球 DNA" accept="application/json,.json" onChange={e=>{void importDNA(e.target.files?.[0]);e.target.value='';}}/></label>{result&&<button className="capture-button" onClick={exportDNA}>保存星球 DNA</button>}<button className="capture-button" onClick={save}><Download size={14}/>保存画面</button></div></footer>
    {toast&&<div className="toast" role="status"><Check size={15}/>{toast}</div>}
    {selectedLandmark&&<div className="modal-backdrop" onClick={()=>setSelectedLandmark(null)}><section className="modal symbol-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="symbol-title"><button className="modal-close" aria-label="关闭符号解读" onClick={()=>setSelectedLandmark(null)}><X size={18}/></button><div className="symbol-hero" style={{color:selectedLandmark.color}}>{LANDMARK_GLYPHS[selectedLandmark.icon]}</div><span className="eyebrow">A LITTLE PIECE OF YOUR WORLD</span><h2 id="symbol-title">{selectedLandmark.label}</h2><p>{selectedLandmark.meaning}</p><p className="privacy-note">{selectedLandmark.placement==='companion'?'奶蛙身边的一个小陪伴':'散落在星球另一处的小发现'} · 来自 {selectedLandmark.evidenceIds.map(id=>id.split(':')[0]).filter((v,i,a)=>a.indexOf(v)===i).map(v=>({posts:'自述与帖子',music:'音乐',images:'图片',interests:'兴趣',videos:'视频信息',otherComments:'他人视角'}[v]||'你分享的内容')).join('、')||'对你分享内容的创意联想'}</p></section></div>}
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="关闭" onClick={()=>setAbout(false)}><X size={18}/></button><span className="eyebrow">THE PERSONAVERSE IDEA</span><h2>从你的描述，生长出一个世界。</h2><p>第一阶段综合理解你分享的内容，提炼情绪氛围、兴趣、矛盾与富有想象力的标签，形成 Universe DNA。第二阶段将这些含义翻译成可执行的地表、配色、大气、星带和运动配置。</p><p>标签是可修正的创意理解，不是性格诊断。内部的几何模块只是画笔，每个人的故事决定如何组合它们。当前渲染器的能力仍有限，无法实现的想象会标明视觉折衷。</p><div className="pipeline-mini">你的描述 <ArrowRight size={12}/> 标签与 DNA <ArrowRight size={12}/> 动态星球</div></section></div>}
    {studio&&<div className="modal-backdrop" onClick={()=>setStudio(false)}><section className="modal mascot-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mascot-title"><button className="modal-close" aria-label="关闭奶蛙解读" onClick={()=>setStudio(false)}><X size={18}/></button><MascotPortrait spec={spec.mascot} artwork={mascotArtwork}/><span className="eyebrow">YOUR PERSONAL MILKFROG</span><h2 id="mascot-title">{result?'把你的偏爱，穿在身上。':'奶蛙正在等你的故事。'}</h2><p>{spec.mascot.meaning}</p>{spec.mascot.label&&<span className="mascot-badge">{spec.mascot.label}</span>}{result&&<><div className="dna-themes">{result.dna.themes.map((t,i)=><span key={i}>{t.name}</span>)}</div><p>{result.dna.vision}</p><button className="personalize" disabled={artStage==='drawing'} onClick={()=>void drawMascot(result)}><Sparkles size={14}/>{artStage==='drawing'?'正在绘制…':mascotArtwork?'重新绘制专属形象':'生成专属形象'}</button></>}<p className="privacy-note">{mascotArtwork?'角色由你的 Universe DNA 生成，姿态、衣饰和随身物件由整体故事决定。':'当前为备用装扮。专属生图会综合你的情绪、兴趣和标签重新绘制角色；若服务不可用，保留当前装扮。'}</p>{artStage==='unavailable'&&<p className="form-error">生图服务暂不可用，星球与标签仍可正常使用。</p>}</section></div>}
  </div>;
}
function MascotPortrait({spec,artwork}:{spec:MascotSpec;artwork:string|null}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const canvas=ref.current!;void paintMascotPortrait(canvas,spec,artwork).catch(()=>paintMascotPortrait(canvas,spec));},[spec,artwork]);return <canvas className="mascot-portrait" width={1024} height={1200} ref={ref} role="img" aria-label="你的奶蛙装扮"/>;}
