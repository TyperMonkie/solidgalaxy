import { writeFile } from 'node:fs/promises';
import { profile, compile } from './pipeline.ts';
import { loadProviderConfig } from './config.ts';
// Synthetic inputs only. Run explicitly; never called by the test suite or page load.
const config=await loadProviderConfig();
console.log(JSON.stringify({provider:new URL(config.baseUrl).hostname,model:config.model}));
const start=performance.now();
try{
 const first=await profile({posts:['我喜欢夜里独自走过城市，观察建筑的秩序，也喜欢电子音乐里失控的节奏。这只是用于测试的虚构描述。'],interests:['architecture','electronic music','solitude'],music:[{title:'A fictional quiet circuit',artist:'Test artist',metadata:'Fictional metadata for integration testing; do not infer audio qualities.'}],images:[],videos:[],otherComments:[],seed:78291});
 console.log(JSON.stringify({stage:'profile',title:first.data.title,directions:first.data.directions.length,elapsedSeconds:Math.round((performance.now()-start)/1000)}));
 const second=await compile(first.data);
 const result={synthetic:true,dna:first.data,...second,profileMeta:first.meta,elapsedSeconds:Math.round((performance.now()-start)/1000)};
 await writeFile('docs/ai-smoke-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({stage:'complete',style:second.renderSpec.style,geometry:second.renderSpec.geometry.type,degraded:second.degraded,elapsedSeconds:result.elapsedSeconds}));
}catch(e){console.error(e instanceof Error?e.message:'Integration test failed');process.exitCode=1;}
