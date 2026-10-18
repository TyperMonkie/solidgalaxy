import { ACESFilmicToneMapping, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, Material, Mesh, PerspectiveCamera, Points, PointsMaterial, Float32BufferAttribute, Scene, ShaderMaterial, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { validateRenderSpec, type RenderSpec } from './RenderSpec.ts';
import { createPlanetGeometry } from './PlanetGeometry.ts';
import { createPlanetMaterial } from './PlanetMaterial.ts';
import { createAtmosphere } from './PlanetAtmosphere.ts';
import { createOrbits } from './OrbitalGeometry.ts';
import { createStructures } from './SurfaceStructures.ts';
import { createClouds } from './PlanetClouds.ts';
import { createPostFX } from './PlanetPostFX.ts';
import { hashSeed } from './procedural.ts';
import { PMREMGenerator } from 'three';
import { InstancedMesh } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export interface PlanetStats {fps:number;triangles:number;drawCalls:number;vertices:number;renderer:string;frameMs:number;}
function disposeGroup(group:Group){
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
  group.traverse(object=>{if(object instanceof Mesh || object instanceof Points){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();
}
/** Independent, DOM-hosted engine. The only application input is a validated RenderSpec. */
export class PlanetCore {
  readonly renderer:WebGLRenderer;
  readonly scene=new Scene();
  readonly camera=new PerspectiveCamera(35,1,.1,100);
  readonly controls:OrbitControls;
  private root=new Group(); private globe=new Group();private orbit=new Group();private stars=new Group();private cloudLayer:Points<BufferGeometry,ShaderMaterial>|null=null;
  private spec:RenderSpec;
  private fx:ReturnType<typeof createPostFX>;
  private resizeObserver:ResizeObserver;private frame=0;private previous=0;private time=0;private frames=0;private frameSum=0;private elapsed=0;
  private shaders:ShaderMaterial[]=[];private rotationLight:DirectionalLight;private fill:HemisphereLight;
  private environment:ReturnType<PMREMGenerator['fromScene']>;
  onStats?:(stats:PlanetStats)=>void;
  constructor(private host:HTMLElement,spec:RenderSpec){
    this.spec=validateRenderSpec(spec);
    this.renderer=new WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x080a10,0);this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    const pmrem=new PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
    this.renderer.domElement.setAttribute('aria-label','Interactive procedural planet. Drag to orbit; scroll to zoom.');this.renderer.domElement.setAttribute('role','img');
    host.appendChild(this.renderer.domElement);this.camera.position.set(0,.15,6.8);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.065;this.controls.enablePan=false;this.controls.minDistance=3.6;this.controls.maxDistance=11;this.controls.target.set(0,0,0);
    this.rotationLight=new DirectionalLight('#d9ecff',3);this.rotationLight.position.set(-2.8,3.5,3.8);this.scene.add(this.rotationLight);
    const rim=new DirectionalLight('#7773d6',1.2);rim.position.set(4,1,-3);this.scene.add(rim);
    this.fill=new HemisphereLight('#b4c8e8','#11121e',.7);this.scene.add(this.fill,this.root);
    this.fx=createPostFX(this.renderer,this.scene,this.camera);
    this.setSpec(spec);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.frame=requestAnimationFrame(this.animate);
  }
  setSpec(input:RenderSpec){
    const spec=validateRenderSpec(input),keepPose=this.root.children.length>0&&this.spec.seed===spec.seed,pose=this.globe.rotation.clone();this.spec=spec;disposeGroup(this.root);this.shaders=[];this.globe=new Group();this.orbit=new Group();this.stars=new Group();this.cloudLayer=null;if(!keepPose)this.time=0;
    if(keepPose)this.globe.rotation.copy(pose);else this.globe.rotation.set(.08,-.38,-.19);
    if(spec.geometry.enabled){const surface=createPlanetMaterial(spec);this.globe.add(new Mesh(createPlanetGeometry(spec),surface));this.shaders.push(surface);}
    if(spec.atmosphere.enabled)this.root.add(createAtmosphere(spec));
    if(spec.orbits.enabled){this.orbit=createOrbits(spec);this.root.add(this.orbit);const materials=new Set<ShaderMaterial>();this.orbit.traverse(o=>{if((o instanceof Mesh||o instanceof Points)&&o.material instanceof ShaderMaterial)materials.add(o.material);});this.shaders.push(...materials);}
    if(spec.structures.enabled&&spec.structures.count>0)this.globe.add(createStructures(spec));
    if(spec.modules.clouds){const clouds=createClouds(spec);this.globe.add(clouds);this.shaders.push(clouds.material);this.cloudLayer=clouds;clouds.rotation.y=this.time*.012;}
    if(spec.modules.stars){const pos:number[]=[];for(let i=0;i<72;i++){pos.push((hashSeed(spec.seed,i+700)-.5)*22,(hashSeed(spec.seed,i+800)-.5)*15,-5-hashSeed(spec.seed,i+900)*5);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));this.stars.add(new Points(g,new PointsMaterial({color:'#8a96ae',size:.013,transparent:true,opacity:.5})));this.root.add(this.stars);}
    this.root.add(this.globe);this.rotationLight.intensity=spec.lighting.enabled?spec.lighting.intensity*2:0;this.fill.intensity=spec.lighting.ambient*5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,spec.quality==='high'?1.75:spec.quality==='low'?1:1.25));
    this.shaders.forEach(m=>m.uniforms.uTime.value=this.time*spec.animation.flow);
    this.resize();
  }
  setPaused(paused:boolean){this.spec.animation.enabled=!paused;}
  resetView(){this.camera.position.set(0,.15,6.8);this.controls.target.set(0,0,0);this.controls.update();}
  /** Same camera, pose and shader time for repeatable cross-preset comparisons. */
  comparisonPose(){this.resetView();this.time=0;this.globe.rotation.set(.08,-.38,-.19);this.spec.animation.enabled=false;this.shaders.forEach(m=>m.uniforms.uTime.value=0);this.draw();}
  capture(){this.draw();return this.renderer.domElement.toDataURL('image/png');}
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);const pixelRatio=this.renderer.getPixelRatio();this.shaders.forEach(m=>{if(m.uniforms.uPointScale)m.uniforms.uPointScale.value=m===this.cloudLayer?.material?pixelRatio*Math.max(.5,Math.min(1.4,h/700)):pixelRatio;});this.fx.composer.setPixelRatio(pixelRatio);this.fx.composer.setSize(w,h);}
  private draw(){if(this.spec.modules.postFX&&this.spec.quality!=='low')this.fx.composer.render();else this.renderer.render(this.scene,this.camera);}
  private animate=(now:number)=>{
    this.frame=requestAnimationFrame(this.animate);
    if(document.hidden){this.previous=now;return;}
    const rawDt=this.previous?(now-this.previous)/1000:0;const dt=Math.min(rawDt,.05);this.previous=now;this.elapsed+=rawDt;
    if(this.spec.animation.enabled){this.time+=dt;this.globe.rotation.y+=dt*this.spec.animation.rotation;this.orbit.rotation.z=this.spec.orbits.tilt+Math.sin(this.time*.11)*.06;this.orbit.rotation.y=.18+Math.sin(this.time*.075)*.12;this.orbit.children.forEach((o,i)=>{o.rotation.z=this.time*this.spec.animation.rotation*(i%2===0?.7:-.45);});if(this.cloudLayer)this.cloudLayer.rotation.y=this.time*.012;this.shaders.forEach(m=>m.uniforms.uTime.value=this.time*this.spec.animation.flow);}
    this.renderer.domElement.dataset.motion=JSON.stringify({time:Number(this.time.toFixed(3)),rotation:Number(this.globe.rotation.y.toFixed(4)),paused:!this.spec.animation.enabled,clouds:this.spec.modules.clouds});
    this.controls.update();const before=performance.now();this.draw();this.frameSum+=performance.now()-before;this.frames++;
    if(this.elapsed>=2){let vertices=0,triangles=0,drawCalls=0;this.root.traverse(o=>{if(o instanceof Mesh||o instanceof Points){vertices+=o.geometry.attributes.position.count;if(o instanceof Mesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o instanceof InstancedMesh?o.count:1);drawCalls++;}});const stats={fps:Math.round(this.frames/this.elapsed),triangles,drawCalls,vertices,renderer:'WebGL 2',frameMs:Math.round(this.frameSum/this.frames*10)/10};this.renderer.domElement.dataset.renderStats=JSON.stringify(stats);this.onStats?.(stats);this.frames=0;this.frameSum=0;this.elapsed=0;}
  };
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();disposeGroup(this.root);this.fx.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}


