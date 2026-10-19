import { ACESFilmicToneMapping, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, Material, Mesh, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer, Sprite, Texture, Raycaster, Vector2, Vector3, Line } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { validateRenderSpec, type RenderSpec } from './RenderSpec.ts';
import { createPlanetGeometry } from './PlanetGeometry.ts';
import { createPlanetMaterial } from './PlanetMaterial.ts';
import { createAtmosphere } from './PlanetAtmosphere.ts';
import { createOrbits, updateOrbitPose } from './OrbitalGeometry.ts';
import { createStructures } from './SurfaceStructures.ts';
import { createClouds } from './PlanetClouds.ts';
import { createPostFX } from './PlanetPostFX.ts';
import { createSpaceBackdrop } from './SpaceBackdrop.ts';
import { PMREMGenerator } from 'three';
import { InstancedMesh } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMascot } from './PlanetMascot.ts';
import { createLandmarks } from './PlanetLandmarks.ts';
import type { LandmarkSpec } from './RenderSpec.ts';
import { weatherSettings, lightingSettings, bloomSettings } from './ProceduralSettings.ts';
import { advanceGlobe, motionSettings, mascotAnchor, symbolSettings, updateMascot, backgroundSettings } from './ArtSettings.ts';
import { createLocalWeather, conformWeatherToSurface } from './PlanetWeather.ts';
import { weatherAnchor, updateClimateUniforms } from './ClimateField.ts';
import { cloudPointScale } from './CloudReadout.ts';
export interface PlanetStats {fps:number;triangles:number;drawCalls:number;vertices:number;renderer:string;frameMs:number;}
function disposeGroup(group:Group){
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>();
  group.traverse(object=>{if(object instanceof Mesh || object instanceof Points || object instanceof Sprite || object instanceof Line){if(!(object instanceof Sprite))geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>{materials.add(m);if('map' in m&&m.map instanceof Texture)textures.add(m.map);});}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>{t.userData.released=true;t.dispose();});materials.forEach(m=>m.dispose());group.clear();
}
/** Independent, DOM-hosted engine. The only application input is a validated RenderSpec. */
export class PlanetCore {
  readonly renderer:WebGLRenderer;
  readonly scene=new Scene();
  readonly camera=new PerspectiveCamera(35,1,.1,100);
  readonly controls:OrbitControls;
  private root=new Group(); private globe=new Group();private orbit=new Group();private cloudLayer:Points<BufferGeometry,ShaderMaterial>|null=null;
  private backdrop=createSpaceBackdrop();
  private spec:RenderSpec;
  private fx:ReturnType<typeof createPostFX>;
  private resizeObserver:ResizeObserver;private frame=0;private previous=0;private time=0;private frames=0;private frameSum=0;private elapsed=0;
  private shaders:ShaderMaterial[]=[];private rotationLight:DirectionalLight;private fill:HemisphereLight;
  private environment:ReturnType<PMREMGenerator['fromScene']>;
  private mascotSprite:Sprite|null=null;private planetSurface:Mesh|null=null;private pointerDown=new Vector2();
  private mascotArtwork:string|null=null;private paused=false;
  onMascotSelect?:()=>void;
  private landmarkSprites:Sprite[]=[];onLandmarkSelect?:(landmark:LandmarkSpec)=>void;
  onStats?:(stats:PlanetStats)=>void;
  constructor(private host:HTMLElement,spec:RenderSpec){
    this.spec=validateRenderSpec(spec);
    this.paused=!spec.animation.enabled;
    this.renderer=new WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x020306,0);this.renderer.toneMapping=ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
    const pmrem=new PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
    this.renderer.domElement.setAttribute('aria-label','Interactive procedural planet. Drag to orbit; scroll to zoom.');this.renderer.domElement.setAttribute('role','img');
    host.appendChild(this.renderer.domElement);this.camera.position.set(0,.15,6.8);
    this.renderer.domElement.addEventListener('pointerdown',this.mascotPointerDown);this.renderer.domElement.addEventListener('pointerup',this.mascotPointerUp);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.065;this.controls.enablePan=false;this.controls.minDistance=3.6;this.controls.maxDistance=11;this.controls.target.set(0,0,0);
    this.rotationLight=new DirectionalLight('#d9ecff',3);this.rotationLight.position.set(-2.8,3.5,3.8);this.scene.add(this.rotationLight);
    this.fill=new HemisphereLight('#b4c8e8','#11121e',.7);this.scene.add(this.fill,this.root,this.backdrop.group);
    this.fx=createPostFX(this.renderer,this.scene,this.camera);
    this.setSpec(spec);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.frame=requestAnimationFrame(this.animate);
  }
  setSpec(input:RenderSpec,forceRebuild=false){
    const spec=validateRenderSpec(input);
    if(this.spec.animation.enabled!==spec.animation.enabled)this.paused=!spec.animation.enabled;
    const light=lightingSettings(spec);this.rotationLight.position.set(...light.direction).normalize().multiplyScalar(5);this.rotationLight.color.set(light.color);this.rotationLight.intensity=light.enabled?light.intensity*2:0;this.fill.color.set(light.color);this.fill.intensity=light.ambient*5;
    this.fx.setBloom(bloomSettings(spec));
    if(!this.root.children.length||JSON.stringify([this.spec.background,this.spec.modules.stars,this.spec.seed])!==JSON.stringify([spec.background,spec.modules.stars,spec.seed])){this.scene.remove(this.backdrop.group);this.backdrop.dispose();this.backdrop=createSpaceBackdrop(spec);this.scene.add(this.backdrop.group);}
    this.renderer.setClearColor(backgroundSettings(spec).color,spec.background?1:0);
    // A scene colour clears in the current target's colour space, including
    // RenderPass's linear buffer. A renderer-only clear can retain sRGB state.
    this.scene.background=spec.background?new Color(spec.background.color):null;
    const base=(s:RenderSpec)=>JSON.stringify({...s,terrain:undefined,weather:undefined});
    if(!forceRebuild&&this.planetSurface&&base(this.spec)===base(spec)){
      // Slider edits update uniforms in place, retaining surface buffers, icons and pose.
      const material=this.planetSurface.material as ShaderMaterial,next=createPlanetMaterial(spec);
      for(const [key,uniform] of Object.entries(next.uniforms))if(key!=='uTime'){material.uniforms[key]=uniform;for(const weather of this.shaders)if(weather.userData.localWeather&&key in weather.uniforms&&key!=='uColor')weather.uniforms[key]=uniform;}
      next.dispose();
      if(this.cloudLayer&&JSON.stringify(this.spec.weather)!==JSON.stringify(spec.weather)){
        const old=this.cloudLayer;this.globe.remove(old);this.shaders=this.shaders.filter(m=>m!==old.material);old.geometry.dispose();old.material.dispose();
        this.cloudLayer=createClouds(spec);this.cloudLayer.rotation.copy(old.rotation);this.cloudLayer.material.uniforms.uTime.value=this.time;this.globe.add(this.cloudLayer);this.shaders.push(this.cloudLayer.material);
      }
      this.spec=spec;this.resize();return;
    }
    const oldTilt=motionSettings(this.spec).axialTilt,keepPose=this.root.children.length>0&&this.spec.seed===spec.seed,pose=this.globe.rotation.clone();this.spec=spec;disposeGroup(this.root);this.shaders=[];this.globe=new Group();this.orbit=new Group();this.cloudLayer=null;if(!keepPose)this.time=0;
    if(keepPose){this.globe.rotation.copy(pose);this.globe.rotation.z+=motionSettings(spec).axialTilt-oldTilt;}else this.globe.rotation.set(.08,-.38,motionSettings(spec).axialTilt);
    this.planetSurface=null;this.mascotSprite=null;this.landmarkSprites=[];
    if(spec.geometry.enabled){const surface=createPlanetMaterial(spec);this.planetSurface=new Mesh(createPlanetGeometry(spec),surface);this.globe.add(this.planetSurface);this.shaders.push(surface);}
    if(spec.atmosphere.enabled)this.root.add(createAtmosphere(spec));
    if(spec.orbits.enabled){this.orbit=createOrbits(spec);this.root.add(this.orbit);const materials=new Set<ShaderMaterial>();this.orbit.traverse(o=>{if((o instanceof Mesh||o instanceof Points)&&o.material instanceof ShaderMaterial)materials.add(o.material);});this.shaders.push(...materials);}
    if(spec.structures.enabled&&spec.structures.count>0)this.globe.add(createStructures(spec));
    if(spec.modules.clouds){const clouds=createClouds(spec);this.globe.add(clouds);this.shaders.push(clouds.material);this.cloudLayer=clouds;clouds.rotation.y=this.time*weatherSettings(spec).drift;}
    const climate=createLocalWeather(spec);if(this.planetSurface)conformWeatherToSurface(climate,this.planetSurface.material as ShaderMaterial);this.globe.add(climate);climate.traverse(o=>{if((o instanceof Mesh||o instanceof Points)&&o.material instanceof ShaderMaterial)this.shaders.push(o.material);});
    if(spec.mascot.enabled){const mascot=createMascot(spec.mascot,this.mascotArtwork);this.globe.add(mascot.group);this.mascotSprite=mascot.sprite;}
    if(spec.landmarks.length){const landmarks=createLandmarks(spec.landmarks,symbolSettings(spec),mascotAnchor(spec.mascot));this.globe.add(landmarks.group);this.landmarkSprites=landmarks.sprites;}
    this.root.add(this.globe);this.rotationLight.intensity=spec.lighting.enabled?spec.lighting.intensity*2:0;this.fill.intensity=spec.lighting.ambient*5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,spec.quality==='high'?1.75:spec.quality==='low'?1:1.25));
    this.shaders.forEach(m=>{if(m.uniforms.uTime)m.uniforms.uTime.value=(m===this.cloudLayer?.material||m.userData.localWeather)?this.time:this.time*spec.animation.flow;if(m.uniforms.uOrbitTime)m.uniforms.uOrbitTime.value=this.time;});
    this.resize();
  }
  setPaused(paused:boolean){this.paused=paused;}
  setMascotArtwork(url:string|null){if(url===this.mascotArtwork)return;this.mascotArtwork=url;this.setSpec(this.spec,true);}
  resetView(){this.camera.position.set(0,.15,6.8);this.controls.target.set(0,0,0);this.controls.update();}
  focusMascot(){if(!this.mascotSprite)return;this.scene.updateMatrixWorld(true);const position=this.mascotSprite.getWorldPosition(this.camera.position.clone());this.camera.position.copy(position.normalize().multiplyScalar(6.2));this.controls.target.set(0,0,0);this.controls.update();}
  focusWeather(id:string){const r=this.spec.climate?.regions.find(r=>r.id===id);if(!r)return;this.scene.updateMatrixWorld(true);const normal=weatherAnchor(r),side=new Vector3(1,0,0).cross(normal).normalize();const center=this.globe.localToWorld(normal.addScaledVector(side,.7).normalize());this.camera.position.copy(center.normalize().multiplyScalar(5.7));this.controls.target.set(0,0,0);this.controls.update();}
  focusLandmark(id:string){const sprite=this.landmarkSprites.find(s=>s.userData.landmark.id===id);if(!sprite)return;this.scene.updateMatrixWorld(true);const position=sprite.getWorldPosition(this.camera.position.clone());this.camera.position.copy(position.normalize().multiplyScalar(5.5));this.controls.target.set(0,0,0);this.controls.update();}
  /** Same camera, pose and shader time for repeatable cross-preset comparisons. */
  comparisonPose(){this.resetView();this.time=0;this.globe.rotation.set(.08,-.38,motionSettings(this.spec).axialTilt);this.paused=true;if(this.cloudLayer)this.cloudLayer.rotation.y=0;this.shaders.forEach(m=>{if(m.uniforms.uTime)m.uniforms.uTime.value=0;if(m.uniforms.uOrbitTime)m.uniforms.uOrbitTime.value=0;});updateOrbitPose(this.orbit,this.spec,0);this.draw();}
  capture(){this.draw();return this.renderer.domElement.toDataURL('image/png');}
  private mascotPointerDown=(e:PointerEvent)=>{this.pointerDown.set(e.clientX,e.clientY);};
  private mascotPointerUp=(e:PointerEvent)=>{
    if(e.button!==0||this.pointerDown.distanceTo(new Vector2(e.clientX,e.clientY))>7)return;
    const box=this.renderer.domElement.getBoundingClientRect(),ray=new Raycaster();ray.setFromCamera(new Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),this.camera);
    const targets=[...this.landmarkSprites,...(this.mascotSprite?[this.mascotSprite]:[])],hits=ray.intersectObjects(targets,false);
    const globeHit=this.planetSurface?ray.intersectObject(this.planetSurface)[0]:undefined;
    for(const hit of hits){if(globeHit&&globeHit.distance<hit.distance-.02)continue;const sprite=hit.object as Sprite;
      const image=sprite.material.map?.image as HTMLCanvasElement|undefined;
      if(hit.uv&&image?.getContext){const alpha=image.getContext('2d')?.getImageData(Math.min(image.width-1,Math.max(0,Math.floor(hit.uv.x*image.width))),Math.min(image.height-1,Math.max(0,Math.floor((1-hit.uv.y)*image.height))),1,1).data[3];if(!alpha||alpha<30)continue;}
      if(sprite.userData.landmark)this.onLandmarkSelect?.(sprite.userData.landmark);else this.onMascotSelect?.();return;
    }
  };
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);const pixelRatio=this.renderer.getPixelRatio();this.shaders.forEach(m=>{if(m.uniforms.uPointScale)m.uniforms.uPointScale.value=(m===this.cloudLayer?.material||m.userData.weatherCloud)?cloudPointScale(pixelRatio,h,this.camera.fov):pixelRatio;});this.fx.composer.setPixelRatio(pixelRatio);this.fx.composer.setSize(w,h);}
  private draw(){updateClimateUniforms(this.shaders,this.time,this.cloudLayer,!this.paused);this.backdrop.update(this.time,this.camera);if(this.spec.modules.postFX&&this.spec.quality!=='low')this.fx.composer.render();else this.renderer.render(this.scene,this.camera);}
  private animate=(now:number)=>{
    this.frame=requestAnimationFrame(this.animate);
    if(document.hidden){this.previous=now;return;}
    const rawDt=this.previous?(now-this.previous)/1000:0;const dt=Math.min(rawDt,.05);this.previous=now;this.elapsed+=rawDt;
    if(!this.paused){this.time+=dt;advanceGlobe(this.globe,this.spec,dt);updateOrbitPose(this.orbit,this.spec,this.time);if(this.cloudLayer)this.cloudLayer.rotation.y=this.time*weatherSettings(this.spec).drift;this.shaders.forEach(m=>{if(m.uniforms.uTime)m.uniforms.uTime.value=(m===this.cloudLayer?.material||m.userData.localWeather)?this.time:this.time*this.spec.animation.flow;if(m.uniforms.uOrbitTime)m.uniforms.uOrbitTime.value=this.time;});}
    this.renderer.domElement.dataset.motion=JSON.stringify({time:Number(this.time.toFixed(3)),rotation:Number(this.globe.rotation.y.toFixed(4)),paused:this.paused,clouds:this.spec.modules.clouds});
    if(this.mascotSprite){updateMascot(this.mascotSprite,this.spec.mascot,this.time);}
    this.controls.update();const before=performance.now();this.draw();this.frameSum+=performance.now()-before;this.frames++;
    if(this.elapsed>=2){let vertices=0,triangles=0,drawCalls=0;this.scene.traverse(o=>{if(o instanceof Mesh||o instanceof Points){vertices+=o.geometry.attributes.position.count;if(o instanceof Mesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o instanceof InstancedMesh?o.count:1);drawCalls++;}});const stats={fps:Math.round(this.frames/this.elapsed),triangles,drawCalls,vertices,renderer:'WebGL 2',frameMs:Math.round(this.frameSum/this.frames*10)/10};this.renderer.domElement.dataset.renderStats=JSON.stringify(stats);this.onStats?.(stats);this.frames=0;this.frameSum=0;this.elapsed=0;}
  };
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.mascotPointerDown);this.renderer.domElement.removeEventListener('pointerup',this.mascotPointerUp);disposeGroup(this.root);this.backdrop.dispose();this.fx.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}


