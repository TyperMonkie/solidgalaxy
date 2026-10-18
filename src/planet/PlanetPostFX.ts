import { Vector2, WebGLRenderer, Scene, Camera } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export function createPostFX(renderer:WebGLRenderer,scene:Scene,camera:Camera){
  const composer=new EffectComposer(renderer);
  const bloom=new UnrealBloomPass(new Vector2(1,1),.16,.35,1.05);
  composer.addPass(new RenderPass(scene,camera));composer.addPass(bloom);composer.addPass(new OutputPass());
  return { composer,dispose:()=>{composer.passes.forEach(p=>p.dispose());composer.dispose();} };
}
