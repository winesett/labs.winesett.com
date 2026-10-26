import * as THREE from '/relay/vendor/three.module.js';
import data from './heart-motion-data-v1.js';
import {clamp,prepare,pose} from './fold-geometry-v1.js';
const track=document.querySelector('#paper-story'),canvas=document.querySelector('#paper-scene');
if(track&&canvas) start();
function start(){
 const fallback=track.querySelector('.motion-fallback'),controls=track.querySelector('.fold-controls'),slider=track.querySelector('input[type=range]'),play=track.querySelector('[data-play]'),replay=track.querySelector('[data-replay]'),follow={checked:true},title=track.querySelector('[data-fold-title]'),count=track.querySelector('[data-fold-count]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.6,1.6,1.6,-1.6,.1,30);camera.position.set(0,0,7);
 scene.add(new THREE.AmbientLight(0xffffff,.9));const key=new THREE.DirectionalLight(0xfff5df,2);key.position.set(-2,3,9);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});key.shadow.radius=3;key.shadow.bias=-.0003;scene.add(key);const fill=new THREE.DirectionalLight(0xe4ebdd,.8);fill.position.set(4,-1,3);scene.add(fill);
 const paper=new THREE.Group();scene.add(paper);const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.035}));ground.position.z=-.85;ground.receiveShadow=true;scene.add(ground);
 const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;const ctx=textureCanvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=420;
 for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=243+(seed%12);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const grain=new THREE.CanvasTexture(textureCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(3,3);grain.colorSpace=THREE.SRGBColorSpace;
 const guideMaterial=new THREE.LineDashedMaterial({color:0xf4e5c3,dashSize:.045,gapSize:.025,transparent:true,opacity:.65});const guides=[];for(const pts of [[0,-1,.025,0,1,.025],[-1,0,.026,1,0,.026]]){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const line=new THREE.Line(geo,guideMaterial);line.computeLineDistances();paper.add(line);guides.push(line);}
 const materials=[];for(const colored of [false,true])for(const side of [THREE.FrontSide,THREE.BackSide]){const coloredFace=side===THREE.FrontSide?!colored:colored;materials.push(new THREE.MeshStandardMaterial({color:coloredFace?0xba4634:0xf4e5c3,map:grain,bumpMap:grain,bumpScale:.006,roughness:1,metalness:0,side}));}
 let meshes=[],plan,index=-1,progress=0,playing=false,frame=0,last=0,visible=true,disposed=false;
 const plans=data.steps.map((_,i)=>prepare(data,i));
 function build(i){meshes.forEach(m=>{paper.remove(m);m.geometry.dispose();});meshes=[];plan=plans[i];index=i;
 for(const piece of plan.pieces){let points=piece.points;const signed=points.reduce((s,p,j)=>{const q=points[(j+1)%points.length];return s+p.x*q.y-q.x*p.y;},0);const indices=[];for(let j=1;j<points.length-1;j++)indices.push(...(signed>0?[0,j+1,j]:[0,j,j+1]));const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(points.length*3),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[(p.x+1)/2,(1-p.y)/2]),2));geometry.setIndex(indices);geometry.addGroup(0,indices.length,0);geometry.addGroup(0,indices.length,1);const m=new THREE.Mesh(geometry,materials.slice(piece.colored?2:0,piece.colored?4:2));m.frustumCulled=false;m.castShadow=true;m.receiveShadow=false;paper.add(m);meshes.push(m);}
 }
 function render(){const raw=clamp(progress)*13,i=Math.min(12,Math.floor(raw)),local=raw-i;
 // Brief holds at both ends keep each operation readable during scroll and replay.
 const u=clamp((local-.12)/.76),t=u*u*(3-2*u);if(index!==i)build(i);
 pose(plan,t).forEach((piece,j)=>{const g=meshes[j].geometry,a=g.attributes.position;piece.vertices.forEach((p,k)=>a.setXYZ(k,p.x,-p.y,p.z));a.needsUpdate=true;g.computeVertexNormals();});
 paper.rotation.set(-.15,.12*Math.sin(progress*Math.PI),-.035);const zoom=1+clamp((progress-.42)/.58)*.85;paper.scale.setScalar(zoom);paper.position.y=-clamp((progress-.42)/.58)*.2;
 guides[0].visible=i<4;guides[1].visible=i>=2&&i<4;renderer.render(scene,camera);slider.value=String(Math.round(progress*1300));slider.setAttribute('aria-valuetext',`${i+1} of 13: ${data.steps[i].title}`);title.textContent=data.steps[i].title;count.textContent=`${String(i+1).padStart(2,'0')} / 13`;canvas.dataset.step=String(i+1);canvas.dataset.progress=progress.toFixed(4);
 }
 function tick(now){frame=0;if(disposed||!visible||document.hidden)return;if(playing){if(last)progress=clamp(progress+(now-last)/32000);last=now;if(progress>=1){playing=false;play.textContent='Play again';play.setAttribute('aria-pressed','false');}}render();if(playing)frame=requestAnimationFrame(tick);}
 function request(){if(!frame&&!disposed)frame=requestAnimationFrame(tick);}
 function stop(){playing=false;last=0;play.textContent='Play';play.setAttribute('aria-pressed','false');}
 function syncScroll(){if(!follow.checked||playing)return;const r=track.getBoundingClientRect();progress=clamp(-r.top/Math.max(1,track.offsetHeight-track.querySelector('.paper-stage').offsetHeight));request();}
 function resize(){const box=canvas.parentElement.getBoundingClientRect(),w=box.width,h=box.height;renderer.setSize(w,h,false);const aspect=w/h;camera.left=-1.35*Math.max(1,aspect);camera.right=-camera.left;camera.top=1.35/Math.min(1,aspect);camera.bottom=-camera.top;camera.updateProjectionMatrix();request();}
 play.addEventListener('click',()=>{if(playing)stop();else{follow.checked=false;playing=true;last=0;if(progress>=1)progress=0;play.textContent='Pause';play.setAttribute('aria-pressed','true');request();}});
 replay.addEventListener('click',()=>{stop();follow.checked=false;progress=0;playing=!reduced.matches;play.textContent=playing?'Pause':'Play';play.setAttribute('aria-pressed',String(playing));request();});
 slider.addEventListener('input',()=>{stop();follow.checked=false;progress=Number(slider.value)/1300;request();});
 function preference(){stop();follow.checked=!reduced.matches;track.classList.toggle('reduced-motion',reduced.matches);if(reduced.matches)progress=1;resize();syncScroll();}
 reduced.addEventListener('change',preference);window.addEventListener('scroll',()=>{if(!playing&&!reduced.matches)follow.checked=true;syncScroll();},{passive:true});window.addEventListener('resize',resize,{passive:true});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible){syncScroll();request();}else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});observer.observe(track);
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else request();});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();disposed=true;cancelAnimationFrame(frame);fallback.hidden=false;canvas.hidden=true;controls.hidden=true;track.classList.remove('motion-ready');});
 window.addEventListener('pagehide',event=>{if(event.persisted){last=0;return;}disposed=true;cancelAnimationFrame(frame);observer.disconnect();meshes.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());grain.dispose();guides.forEach(g=>g.geometry.dispose());guideMaterial.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();},{once:true});
 track.classList.add('motion-ready');controls.hidden=false;fallback.hidden=true;canvas.hidden=false;preference();
}
