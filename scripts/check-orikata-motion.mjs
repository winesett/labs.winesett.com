import assert from 'node:assert/strict';
import data from '../public/orikata/heart-motion-data-v1.js';
import {prepare,pose,area} from '../public/orikata/fold-geometry-v1.js';
const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;};
for(let i=0;i<13;i++){
 const plan=prepare(data,i);
 for(const t of [0,.25,.5,.75,1]){const panels=pose(plan,t);for(let j=0;j<panels.length;j++){const src=plan.pieces[j].points,v=panels[j].vertices;for(let k=0;k<src.length;k++){const n=(k+1)%src.length;assert.ok(Math.abs(Math.hypot(src[n].x-src[k].x,src[n].y-src[k].y)-Math.hypot(v[n].x-v[k].x,v[n].y-v[k].y,v[n].z-v[k].z))<1e-8,`step ${i+1} distorts an edge`);}}}
 for(const t of [0,1]){const panels=pose(plan,t),expected=data.states[i+t];assert.ok(Math.abs(panels.reduce((s,l)=>s+area(l.vertices),0)-expected.reduce((s,l)=>s+area(l.points),0))<1e-8,`step ${i+1} material area mismatch`);
 for(let x=-.98;x<1;x+=.049)for(let y=-.983;y<1;y+=.047){const p={x,y};const actual=panels.filter(l=>inside(p,l.vertices)).sort((a,b)=>a.vertices[0].z-b.vertices[0].z).at(-1),want=expected.filter(l=>inside(p,l.points)).at(-1);assert.equal(Boolean(actual),Boolean(want),`step ${i+1}, endpoint ${t} silhouette`);if(actual){const f=plan.reverse?1-t:t;const flipped=plan.turn?t>.5:actual.moving&&f>.5;assert.equal(flipped?!actual.colored:actual.colored,want.colored,`step ${i+1} endpoint ${t} top face`);}}
 }
}
console.log('13 authored step endpoints match silhouettes, top-face colors and material area; all intermediate panel edges preserve their lengths.');
