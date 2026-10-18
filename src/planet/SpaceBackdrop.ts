import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, PerspectiveCamera, Points, RingGeometry, ShaderMaterial, SphereGeometry } from 'three';
import { hashSeed } from './procedural.ts';

/** A camera-relative deep-space set. It stays behind the personal world while it is explored. */
export function createSpaceBackdrop() {
  const group = new Group();
  group.name = 'Deep space';
  const count = 920, positions: number[] = [], colors: number[] = [], sizes: number[] = [], phases: number[] = [];
  const palette = ['#b8d6ec', '#e8e4cf', '#839dc4', '#c9b7dd', '#e6c99a'].map(c => new Color(c));
  for (let i = 0; i < count; i++) {
    positions.push(hashSeed(83921, i * 7) * 2 - 1, hashSeed(83921, i * 7 + 1) * 2 - 1, -25 - hashSeed(83921, i * 7 + 2) * 20);
    const color = palette[Math.floor(hashSeed(83921, i * 7 + 3) * palette.length)];
    colors.push(color.r, color.g, color.b);
    sizes.push(i < 7 ? 7 + hashSeed(83921, i + 3000) * 6 : .8 + Math.pow(hashSeed(83921, i * 7 + 4), 3) * 2.3);
    phases.push(hashSeed(83921, i * 7 + 5) * Math.PI * 2);
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  starGeometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
  starGeometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  starGeometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  const starMaterial = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, uTanFov: { value: Math.tan(35 * Math.PI / 360) } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uAspect; uniform float uTanFov;
      varying vec3 vColor; varying float vGlow; varying float vSize;
      void main(){ vec3 p=position; p.xy*=(-p.z)*uTanFov; p.x*=uAspect;
        vColor=aColor; vSize=aSize; vGlow=.65+.25*sin(aPhase+uTime*(.19+.1*sin(aPhase)));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); gl_PointSize=aSize; }`,
    fragmentShader: `varying vec3 vColor; varying float vGlow; varying float vSize;
      void main(){ vec2 p=(gl_PointCoord-.5)*2.; float d=length(p);
        float core=exp(-d*d*(vSize>6.?22.:3.5));
        float halo=exp(-d*d*5.)*.15;
        float cross=exp(-min(abs(p.x),abs(p.y))*48.)*pow(max(0.,1.-d),2.)*.28;
        float a=(core+halo+(vSize>6.?cross:0.))*vGlow;
        if(a<.012)discard; gl_FragColor=vec4(vColor,a*.82); }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const stars = new Points(starGeometry, starMaterial);
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
  const layouts = [
    { x: -.78, y: .57, z: -23, radius: .49, base: '#243546', accent: '#718a91', seed: 9 },
    { x: .77, y: .76, z: -28, radius: .33, base: '#4d2d28', accent: '#b58668', seed: 37 },
    { x: .82, y: -.63, z: -25, radius: .56, base: '#292942', accent: '#a194bf', seed: 69 },
  ];
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
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.rotation.set(1.19, .22, -.47);
  ring.renderOrder = -14;
  group.add(ring);

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
        planet.rotation.y = time * (.006 + i * .002);
      });
      ring.position.copy(planets[2].position);
      ring.scale.setScalar(layouts[2].radius);
    },
    dispose() {
      starGeometry.dispose(); starMaterial.dispose(); sphereGeometry.dispose();
      planets.forEach(planet => planet.material.dispose());
      ringGeometry.dispose(); ringMaterial.dispose(); group.clear();
    },
  };
}
