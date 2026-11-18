const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Path2D}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const c={window:{},Math,Path2D,Image:class{set src(v){}}};vm.createContext(c);for(const name of ['soul-design-data','soul-design','soul-motion','soul-render'])vm.runInContext(fs.readFileSync('web/'+name+'.js','utf8'),c);
function verify(phase,dir,offset,air,action=null){const canvas=createCanvas(420,420),ctx=canvas.getContext('2d');const f={x:210,y:340,dir,gait:phase,runWeight:air?0:phase===0?0:1,airWeight:air,lean:phase===0?0:.23,spinPhase:0,spinBlend:0,crossBlend:0,bladeAngle:0,soulMotion:{hair:offset,tip:offset,arm:0,weapon:0},action,blade:{}};c.window.drawSoul(ctx,f,1,false);const {data}=ctx.getImageData(0,0,420,420),mask=new Uint8Array(420*420);for(let i=0;i<mask.length;i++){const j=i*4;if(data[j+3]>200&&Math.abs(data[j]-101)<3&&Math.abs(data[j+1]-29)<3&&Math.abs(data[j+2]-30)<3)mask[i]=1;}
const seen=new Uint8Array(mask.length),sizes=[];for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){const q=[i];seen[i]=1;for(let k=0;k<q.length;k++){const p=q[k];for(const n of [p-420,p+420,...(p%420?[p-1]:[]),...(p%420<419?[p+1]:[])])if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;q.push(n);}}if(q.length>5)sizes.push(q.length);}assert.equal(sizes.length,1,`one body mass phase=${phase} dir=${dir} hair=${offset} air=${air} action=${JSON.stringify(action)}`);
// The head/neck region must be solid, with no backdrop leaking through the nape.
if(phase===0){const inside=ctx.getImageData(210,340-140,1,1).data;assert.ok(inside[3]>240,'solid idle nape');}}
for(const dir of [-1,1])for(const offset of [-23,0,23])for(let i=0;i<12;i++)verify(i*Math.PI/6,dir,offset,0);
for(const dir of [-1,1])verify(1,dir,0,1);
console.log('PASS 74 silhouette poses: uniform connected body and closed nape, both facings and extreme hair lag');

// Isolate the body mask: a luminous trail drawn across it changes its RGB color.
const normalFrame=c.window.SoulDesign.normalFrame;c.window.SoulDesign.normalFrame=f=>({...normalFrame(f),trail:0});
for(const n of [1,2,3])for(const dir of [-1,1])for(let i=0;i<=12;i++)verify(0,dir,0,0,{k:'attack',n,age:i/12*([.32,.35,.5][n-1])});
console.log('PASS 78 normal/thrust silhouette poses remain connected in both facings');
