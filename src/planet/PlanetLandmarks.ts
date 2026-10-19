import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three';
import type { RenderSpec, LandmarkSpec } from './RenderSpec.ts';
export const LANDMARK_GLYPHS:Record<LandmarkSpec['icon'],string>={music:'♫',guitar:'🎸',headphones:'🎧',camera:'📷',compass:'🧭',mountain:'⛰',book:'📖',gamepad:'🎮',lightning:'ϟ',heart:'♡',moon:'☾',chat:'✉',star:'✦',wave:'🌊',flower:'🌹'};
export function landmarkPositions(items:LandmarkSpec[],anchorInput?:Vector3,spread=1){
 const anchor=anchorInput?.clone()??new Vector3(.28,.43,.86).normalize(),side=new Vector3(1,0,0).cross(anchor).normalize(),up=anchor.clone().cross(side).normalize();
 const occupied=[anchor],result:Vector3[]=[];let companion=0;
 for(const item of items){
  let best:Vector3|undefined,bestScore=-1;
  if(item.placement==='companion'&&companion<3){
   const a=[2.4,4.5,.15][companion++],angle=.49*spread;
   best=anchor.clone().multiplyScalar(Math.cos(angle)).add(side.clone().multiplyScalar(Math.cos(a)*Math.sin(angle))).add(up.clone().multiplyScalar(Math.sin(a)*Math.sin(angle))).normalize();
  }else{
   // Deterministic best-candidate packing: keep every symbol apart, including mascot neighbors.
   for(let j=0;j<100;j++){const y=1-2*(j+.5)/100,a=j*2.39996323,r=Math.sqrt(1-y*y),p=new Vector3(Math.cos(a)*r,y,Math.sin(a)*r);const score=Math.min(...occupied.map(q=>p.distanceTo(q)));if(score>bestScore){best=p;bestScore=score;}}
  }
  result.push(best!);occupied.push(best!);
 }
 return result;
}
export function createLandmarks(items:LandmarkSpec[],layout:NonNullable<RenderSpec['symbols']>={scale:1,altitude:.14,spread:1,labels:true},anchor?:Vector3){
 const group=new Group(),sprites:Sprite[]=[];const positions=landmarkPositions(items,anchor,layout.spread);
 items.forEach((item,i)=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=304;const ctx=canvas.getContext('2d')!;
  ctx.shadowColor='#000000';ctx.shadowBlur=20;ctx.fillStyle='#101323e8';ctx.beginPath();ctx.arc(128,119,89,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=item.color;ctx.lineWidth=5;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5dd';ctx.font='108px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';ctx.fillText(LANDMARK_GLYPHS[item.icon],128,121);
  if(layout.labels){ctx.fillStyle='#111323ee';ctx.beginPath();ctx.roundRect(7,230,242,57,17);ctx.fill();ctx.fillStyle='#fff4df';let size=29;ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;while(ctx.measureText(item.label).width>222&&size>16){size--;ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;}ctx.fillText(item.label,128,260);}
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;const sprite=new Sprite(new SpriteMaterial({map,transparent:true,depthWrite:false}));sprite.scale.set(.29*layout.scale,.344*layout.scale,1);sprite.position.copy(positions[i]).multiplyScalar(1+layout.altitude);sprite.userData.landmark=item;sprite.name=item.label;sprite.renderOrder=5;group.add(sprite);sprites.push(sprite);
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([...positions[i].clone().multiplyScalar(1.025).toArray(),...positions[i].clone().multiplyScalar(1+layout.altitude-.01).toArray()],3));group.add(new Line(geometry,new LineBasicMaterial({color:new Color(item.color),transparent:true,opacity:.45})));
 });return {group,sprites};
}
