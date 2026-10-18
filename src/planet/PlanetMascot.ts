import { CanvasTexture, CircleGeometry, Color, Group, Mesh, MeshBasicMaterial, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three';
import type { MascotSpec } from './RenderSpec.ts';
let imagePromise:Promise<HTMLImageElement>|undefined;
export function frogImage(){return imagePromise??=new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{imagePromise=undefined;reject(new Error('Milkfrog asset could not be loaded'));};img.src='/mascot/milkfrog.png';});}
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=6;ctx.stroke();}}
function accessory(ctx:CanvasRenderingContext2D,s:MascotSpec){
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 if(s.accessory==='guitar'){
  ctx.translate(660,825);ctx.rotate(.52);
  // Neck, headstock, two sculpted body lobes and contrasting strings.
  round(ctx,-24,-360,48,350,8,'#704032','#f9d5a6');round(ctx,-36,-427,72,90,12,'#302d39','#efdcbd');
  ctx.strokeStyle='#f2dfae';ctx.lineWidth=6;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-33,-405+i*18);ctx.lineTo(33,-405+i*18);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,-85);ctx.bezierCurveTo(80,-185,140,-110,112,-35);ctx.bezierCurveTo(94,5,172,27,145,110);ctx.bezierCurveTo(110,225,-110,225,-145,110);ctx.bezierCurveTo(-172,27,-94,5,-112,-35);ctx.bezierCurveTo(-140,-110,-80,-185,0,-85);ctx.fillStyle='#a62d46';ctx.fill();ctx.strokeStyle='#ffe9b8';ctx.lineWidth=8;ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,40,48,59,0,0,Math.PI*2);ctx.fillStyle='#201c2a';ctx.fill();round(ctx,-51,118,102,22,4,'#efdbac');
  ctx.strokeStyle='#fff2cf';ctx.lineWidth=2;for(let i=0;i<6;i++){const x=(i-2.5)*5;ctx.beginPath();ctx.moveTo(x,-370);ctx.lineTo(x,130);ctx.stroke();}
  ctx.fillStyle='#fcba73';ctx.beginPath();ctx.arc(82,113,9,0,Math.PI*2);ctx.fill();
 }else if(s.accessory==='headphones'){
  ctx.translate(438,320);ctx.rotate(-.1);ctx.beginPath();ctx.ellipse(0,0,152,144,0,Math.PI,Math.PI*2);ctx.strokeStyle='#252333';ctx.lineWidth=38;ctx.stroke();ctx.strokeStyle=s.accent;ctx.lineWidth=12;ctx.stroke();round(ctx,-174,-12,61,130,25,'#252333','#eee9de');round(ctx,113,-12,61,130,25,'#252333','#eee9de');round(ctx,-164,0,32,100,13,s.accent);round(ctx,132,0,32,100,13,s.accent);
 }else if(s.accessory==='camera'){
  ctx.translate(652,835);ctx.rotate(.18);round(ctx,-160,-95,320,210,26,'#243d54','#f0f1e9');round(ctx,-110,-133,107,45,12,'#243d54','#f0f1e9');ctx.beginPath();ctx.arc(15,10,79,0,Math.PI*2);ctx.fillStyle='#faf1d7';ctx.fill();ctx.beginPath();ctx.arc(15,10,61,0,Math.PI*2);ctx.fillStyle='#153146';ctx.fill();ctx.beginPath();ctx.arc(-3,-8,25,0,Math.PI*2);ctx.fillStyle=s.accent;ctx.fill();round(ctx,106,-58,29,20,4,'#ffd38c');
 }else if(s.accessory==='book'){
  ctx.translate(650,825);ctx.rotate(.1);ctx.beginPath();ctx.moveTo(0,-104);ctx.quadraticCurveTo(-90,-150,-185,-105);ctx.lineTo(-175,130);ctx.quadraticCurveTo(-65,95,0,149);ctx.quadraticCurveTo(65,95,175,130);ctx.lineTo(185,-105);ctx.quadraticCurveTo(90,-150,0,-104);ctx.fillStyle='#fff0d3';ctx.fill();ctx.strokeStyle='#383052';ctx.lineWidth=14;ctx.stroke();ctx.beginPath();ctx.moveTo(0,-100);ctx.lineTo(0,143);ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle='#aa9b8e';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-145,-55+i*30);ctx.lineTo(-35,-43+i*30);ctx.moveTo(35,-43+i*30);ctx.lineTo(145,-55+i*30);ctx.stroke();}
 }else if(s.accessory==='gamepad'){
  ctx.translate(650,830);ctx.rotate(.12);round(ctx,-180,-95,360,190,65,'#3d345b','#f4e9ff');round(ctx,-132,-20,87,25,5,'#d0c4e4');round(ctx,-101,-51,25,87,5,'#d0c4e4');ctx.fillStyle=s.accent;for(const [x,y] of [[95,-40],[130,-8],[60,-8],[95,27]]){ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}
export function paintMascot(canvas:HTMLCanvasElement,image:HTMLImageElement,s:MascotSpec){
 const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,1024,1200);ctx.drawImage(image,50,170,924,920);
 if(s.outfit!=='classic'){
  ctx.save();ctx.globalCompositeOperation='source-atop';ctx.beginPath();ctx.moveTo(395,662);ctx.quadraticCurveTo(610,577,836,691);ctx.lineTo(1030,1120);ctx.lineTo(330,1120);ctx.closePath();ctx.fillStyle=s.outfit==='tour'?'#292431':s.outfit==='explorer'?'#355355':'#6e588b';ctx.fill();ctx.strokeStyle=s.accent;ctx.lineWidth=13;ctx.stroke();
  ctx.translate(646,811);ctx.rotate(.15);ctx.fillStyle='#f4e6cf';ctx.font='700 43px sans-serif';ctx.textAlign='center';ctx.fillText(s.outfit==='tour'?'LIVE / FREE':s.outfit==='explorer'?'OFF THE MAP':'DAY DREAM',0,0);ctx.restore();
 }
 accessory(ctx,s);
}
export function createMascot(s:MascotSpec){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1200;
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
 const material=new SpriteMaterial({map:texture,transparent:true,depthWrite:false});
 const sprite=new Sprite(material);sprite.center.set(.5,.08);sprite.scale.set(.64,.75,1);sprite.name='Personal milkfrog';sprite.renderOrder=5;
 const group=new Group(),anchor=new Vector3(.28,.43,.86).normalize();group.position.copy(anchor).multiplyScalar(1.045);
 const contact=new Mesh(new CircleGeometry(.145,32),new MeshBasicMaterial({color:new Color('#151321'),transparent:true,opacity:.24,depthWrite:false}));contact.quaternion.setFromUnitVectors(new Vector3(0,0,1),anchor);group.add(contact,sprite);
 if(s.label.trim()){
  const badge=document.createElement('canvas');badge.width=768;badge.height=128;const ctx=badge.getContext('2d')!;
  round(ctx,5,5,758,118,28,'#171625',s.accent);let size=58;ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;while(ctx.measureText(s.label).width>690&&size>22){size--;ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;}
  ctx.fillStyle='#fff0ca';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.label,384,66);
  const map=new CanvasTexture(badge);map.colorSpace=SRGBColorSpace;const nameplate=new Sprite(new SpriteMaterial({map,transparent:true,depthWrite:false}));nameplate.scale.set(.58,.097,1);nameplate.position.set(0,.64,.015);nameplate.renderOrder=6;group.add(nameplate);
 }
 void frogImage().then(image=>{if(texture.userData.released)return;paintMascot(canvas,image,s);texture.needsUpdate=true;}).catch(()=>{sprite.visible=false;});
 return {group,sprite};
}
