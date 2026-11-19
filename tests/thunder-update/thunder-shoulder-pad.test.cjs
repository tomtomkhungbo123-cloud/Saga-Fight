const assert=require('node:assert/strict'),M=require('../../web/thunder/model.js');
const pads=M.shoulderPads,front=pads[1],bottom=Math.max(...front.map(p=>p[1]));
assert.ok(M.shoulder.y>bottom+2,'anatomical shoulder must sit below the costume pad');
function inside(point,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
assert.ok(!inside(M.shoulder,front),'arm joint must not be placed in the pauldron');
for(const dir of [-1,1])for(const vx of [-330,0,330])for(const k of ['attack','q','w','e','r']){
 const f={x:500,y:940,vx,vy:0,dir,ground:true,action:null};
 for(let i=0;i<240;i++){
  f.action={k,age:i/120,startup:.1,duration:k==='q'?.72:1.55,diving:k==='w'&&i>55};M.update(f,1/120,i/120);const p=M.skin(f,f.thunderModel);
  for(let j=0;j<M.outline.length;j++){const [x,y]=M.outline[j];if(y<=bottom){assert.equal(p[j*2],x,'upper clothing, collar and pads must not inherit arm or rear-sleeve motion');assert.equal(p[j*2+1],y);}}
  assert.equal(f.thunderModel.arm.shoulder.x,M.shoulder.x);assert.equal(f.thunderModel.arm.shoulder.y,M.shoulder.y);
 }
}
console.log('PASS anatomical pivot below/outside the pauldron; fixed costume pads and collar through all casts, both facings and movement directions');
