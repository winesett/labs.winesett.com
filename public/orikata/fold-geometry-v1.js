// Rigid paper panels, rotating about the authored crease; no shape morphing.
export const clamp = x => Math.max(0, Math.min(1, x));
export function distance(p,c){const dx=c.b.x-c.a.x,dy=c.b.y-c.a.y;return (dx*(p.y-c.a.y)-dy*(p.x-c.a.x))/Math.hypot(dx,dy);}
export function clip(points,c,sign){const out=[];let prev=points.at(-1),pd=distance(prev,c)*sign;for(const p of points){const d=distance(p,c)*sign;if((d>=0)!==(pd>=0)){const t=pd/(pd-d);out.push({x:prev.x+(p.x-prev.x)*t,y:prev.y+(p.y-prev.y)*t});}if(d>=0)out.push({...p});prev=p;pd=d;}return out;}
export function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2;}
export function prepare(data,index){const step=data.steps[index];if(step.operation==='turnOver'){const layers=data.states[index];const xs=layers.flatMap(l=>l.points.map(p=>p.x));return {turn:true,center:(Math.min(...xs)+Math.max(...xs))/2,pieces:layers.map(l=>({...l,moving:true}))};}
 const reverse=step.operation==='unfold',crease=reverse?data.steps[index-1].crease:step.crease;
 const layers=data.states[reverse?index-1:index],sign=distance(crease.corner,crease)>0?1:-1;
 const pieces=[];for(const moving of [false,true])for(const l of layers){const points=clip(l.points,crease,moving?sign:-sign);if(points.length>=3&&area(points)>1e-10)pieces.push({points,colored:l.colored,moving});}
 return {crease,reverse,pieces};}
export function pose(plan,progress){const t=clamp(progress),fold=plan.reverse?1-t:t,angle=Math.PI*fold;return plan.pieces.map((piece,i)=>({...piece,vertices:piece.points.map(p=>{
 let x=p.x,y=p.y,z=0;
 if(plan.turn){x=plan.center+(p.x-plan.center)*Math.cos(Math.PI*t);z=(p.x-plan.center)*Math.sin(Math.PI*t);}
 else if(piece.moving){const c=plan.crease,dx=c.b.x-c.a.x,dy=c.b.y-c.a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,dot=(p.x-c.a.x)*ux+(p.y-c.a.y)*uy,fx=c.a.x+dot*ux,fy=c.a.y+dot*uy;x=fx+(p.x-fx)*Math.cos(angle);y=fy+(p.y-fy)*Math.cos(angle);z=Math.hypot(p.x-fx,p.y-fy)*Math.sin(angle);}
 // Sub-millimeter stack separation prevents coplanar flicker. Reverse the stack as panels turn.
 const bodyCount=plan.pieces.filter(p=>!p.moving).length;
 const order=plan.turn&&t>.5?plan.pieces.length-1-i:piece.moving&&fold>.5?bodyCount+plan.pieces.length-1-i:i;
 return {x,y,z:z+order*.0008};
 })}));}
