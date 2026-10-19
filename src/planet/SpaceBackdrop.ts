import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, PerspectiveCamera, Points, RingGeometry, ShaderMaterial, SphereGeometry } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { backgroundSettings } from './ArtSettings.ts';
import { hashSeed } from './procedural.ts';

/** A camera-relative deep-space set. It stays behind the personal world while it is explored. */
export function createSpaceBackdrop(spec?:RenderSpec) {
  const settings=backgroundSettings(spec),seed=spec?.seed??83921;
  const group = new Group();
  group.name = 'Deep space';
  const count = settings.starCount, positions: number[] = [], colors: number[] = [], sizes: number[] = [], phases: number[] = [];
  const palette = settings.colors.map(c => new Color(c));
  for (let i = 0; i < count; i++) {
    positions.push(hashSeed(seed, i * 7) * 2 - 1, hashSeed(seed, i * 7 + 1) * 2 - 1, -25 - hashSeed(seed, i * 7 + 2) * 20);
    const color = palette[Math.floor(hashSeed(seed, i * 7 + 3) * palette.length)];
    colors.push(color.r, color.g, color.b);
    sizes.push(settings.starSize*(i < 7 ? 7 + hashSeed(seed, i + 3000) * 6 : .8 + Math.pow(hashSeed(seed, i * 7 + 4), 3) * 2.3));
    phases.push(hashSeed(seed, i * 7 + 5) * Math.PI * 2);
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  starGeometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
  starGeometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  starGeometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  const starMaterial = new ShaderMaterial({
    uniforms: { uTime: { value: 0 },uBrightness:{value:settings.brightness},uTwinkle:{value:settings.twinkle},uSpeed:{value:settings.speed}, uAspect: { value: 1 }, uTanFov: { value: Math.tan(35 * Math.PI / 360) } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime,uTwinkle,uSpeed; uniform float uAspect; uniform float uTanFov;
      varying vec3 vColor; varying float vGlow; varying float vSize;
      void main(){ vec3 p=position; p.xy*=(-p.z)*uTanFov; p.x*=uAspect;
        vColor=aColor; vSize=aSize; vGlow=1.-uTwinkle+uTwinkle*(.5+.5*sin(aPhase+uTime*uSpeed*(.19+.1*sin(aPhase))));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); gl_PointSize=aSize; }`,
    fragmentShader: `uniform float uBrightness;varying vec3 vColor; varying float vGlow; varying float vSize;
      void main(){ vec2 p=(gl_PointCoord-.5)*2.; float d=length(p);
        float core=exp(-d*d*(vSize>6.?22.:3.5));
        float halo=exp(-d*d*5.)*.15;
        float cross=exp(-min(abs(p.x),abs(p.y))*48.)*pow(max(0.,1.-d),2.)*.28;
        float a=(core+halo+(vSize>6.?cross:0.))*vGlow;
        if(a<.012)discard; gl_FragColor=vec4(vColor,a*.82*uBrightness); }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const stars = new Points(starGeometry, starMaterial);
  stars.visible=spec?.background?!!spec.modules.stars:true;
  stars.frustumCulled = false;
  stars.renderOrder = -20;
  group.add(stars);

  const sphereGeometry = new SphereGeometry(1, 40, 28);
  const planetFragment = `
    varying vec3 vNormal; varying vec3 vPosition;
    uniform vec3 uBase; uniform vec3 uAccent; uniform float uSeed;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7))+uSeed)*43758.5453);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    void main(){vec3 n=normalize(vNormal); vec3 p=vPosition;
      float terrain=noise(p*3.)*.6+noise(p*8.)*.27+noise(p*21.)*.13;
      float bands=sin(p.y*27.+noise(p*3.)*5.)*.5+.5;
      vec3 albedo=mix(uBase,uAccent,smoothstep(.34,.69,terrain*.8+bands*.2));
      float lit=max(0.,dot(n,normalize(vec3(-.8,.65,1.2))));
      float rim=pow(1.-max(n.z,0.),3.)*smoothstep(-.1,.7,n.x*-.6+n.y*.5);
      vec3 color=albedo*(.018+lit*.75)+uAccent*rim*.24;
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const layouts=settings.planets.map((p,i)=>({...p,z:-p.depth,base:p.color,seed:seed+i*19}));
  const planets = layouts.map((layout) => {
    const material = new ShaderMaterial({
      uniforms: { uBase: { value: new Color(layout.base) }, uAccent: { value: new Color(layout.accent) }, uSeed: { value: layout.seed } },
      vertexShader: 'varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normal; vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: planetFragment,
    });
    const mesh = new Mesh(sphereGeometry, material);
    mesh.scale.setScalar(layout.radius);
    mesh.renderOrder = -15;
    group.add(mesh);
    return mesh;
  });
  const ringGeometry = new RingGeometry(.78, 1.3, 96);
  const ringMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    vertexShader: 'varying vec2 vP; void main(){vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vP; void main(){float r=length(vP);float stripe=.45+.3*sin(r*145.)+.15*sin(r*387.);
      float opacity=smoothstep(.78,.86,r)*(1.-smoothstep(1.18,1.3,r));gl_FragColor=vec4(.43,.43,.57,opacity*stripe*.45);}`,
  });
  const rings=planets.map((planet,i)=>{if(!layouts[i].ring)return null;const ring=new Mesh(ringGeometry,ringMaterial);ring.rotation.set(1.19,.22,-.47);ring.renderOrder=-14;group.add(ring);return ring;});
  group.visible=settings.enabled;

  return {
    group,
    update(time: number, camera: PerspectiveCamera) {
      group.position.copy(camera.position);
      group.quaternion.copy(camera.quaternion);
      const tan = Math.tan(camera.fov * Math.PI / 360);
      starMaterial.uniforms.uTime.value = time;
      starMaterial.uniforms.uAspect.value = camera.aspect;
      starMaterial.uniforms.uTanFov.value = tan;
      planets.forEach((planet, i) => {
        const layout = layouts[i];
        planet.position.set(layout.x * -layout.z * tan * camera.aspect, layout.y * -layout.z * tan, layout.z);
        planet.rotation.y = time * layout.rotation;
      });
      rings.forEach((ring,i)=>{if(ring){ring.position.copy(planets[i].position);ring.scale.setScalar(layouts[i].radius);}});
    },
    dispose() {
      starGeometry.dispose(); starMaterial.dispose(); sphereGeometry.dispose();
      planets.forEach(planet => planet.material.dispose());
      ringGeometry.dispose(); ringMaterial.dispose(); group.clear();
    },
  };
}
