'use strict';
// Q is entirely visual here. Combat remains in the fixed-step engine.
const FairiDash=(()=>{
 const sat=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=sat(x);return x*x*(3-2*x)};
 const CFG={ghostsHigh:4,ghostsLow:2,historyStep:.029,fadeIn:.14,fadeOut:.30,tailMax:430,trailLife:.55,heightHigh:116,heightLow:94};
 const envelope=u=>smooth(u/CFG.fadeIn)*smooth((1-u)/CFG.fadeOut);
 function endX(a,range){return Number.isFinite(a.end)?a.end:Math.max(a.bounds?.min??60,Math.min(a.bounds?.max??1540,a.sx+a.dir*range))}
 function echoes(a,u,quality,range){let out=[],count=quality==='low'?CFG.ghostsLow:CFG.ghostsHigh,now=a.duration*u;for(let i=count;i>0;i--){let past=now-i*CFG.historyStep;if(past<0)continue;out.push({x:a.sx+(endX(a,range)-a.sx)*smooth(past/a.duration),y:a.sy,alpha:(.06+.035*(count-i))*envelope(u)})}return out}
 let ribbons=null;
 function texture(){if(ribbons)return ribbons;ribbons=document.createElement('canvas');ribbons.width=1024;ribbons.height=256;let c=ribbons.getContext('2d');c.scale(2,2);c.translate(440,64);
 // Three feathered nested contours. Blur is baked once, never on the arena canvas.
 let g=c.createLinearGradient(-420,0,65,0);g.addColorStop(0,'#53e5df00');g.addColorStop(.30,'#53e5df50');g.addColorStop(.70,'#59e9e6d9');g.addColorStop(1,'#e5fffaff');
 c.fillStyle=g;c.shadowColor='#5cece6';c.shadowBlur=23;c.beginPath();c.moveTo(-420,0);c.bezierCurveTo(-230,-4,-80,-22,-13,-17);c.bezierCurveTo(10,-16,35,-6,62,0);c.bezierCurveTo(30,7,12,18,-14,16);c.bezierCurveTo(-100,12,-230,3,-420,0);c.fill();c.shadowBlur=0;
 c.fillStyle=g;c.beginPath();c.moveTo(-405,0);c.bezierCurveTo(-180,-2,-54,-10,10,-7);c.quadraticCurveTo(37,-4,62,0);c.quadraticCurveTo(27,4,8,6);c.bezierCurveTo(-70,8,-230,2,-405,0);c.fill();
 c.strokeStyle='#c9fff3c9';c.lineWidth=2.4;c.beginPath();c.moveTo(-300,0);c.bezierCurveTo(-120,-1,7,-3,61,0);c.stroke();
 // Curved pressure wake hugs the forward dagger, rather than a rigid arrowhead.
 c.strokeStyle='#92fff0aa';c.lineWidth=2;c.beginPath();c.moveTo(-20,-22);c.bezierCurveTo(12,-20,42,-10,48,0);c.bezierCurveTo(37,12,7,20,-26,20);c.stroke();return ribbons}
 let bloom=null;
 function bloomTexture(){if(bloom)return bloom;let src=texture();bloom=document.createElement('canvas');bloom.width=1024;bloom.height=256;let c=bloom.getContext('2d');c.filter='blur(11px)';c.drawImage(src,0,0);c.filter='none';return bloom}
 function paint(ctx,v,alpha,quality){if(alpha<.001||v.length<2)return;let h=quality==='low'?CFG.heightLow:CFG.heightHigh;ctx.save();ctx.translate(v.x,v.y);if(v.angle)ctx.rotate(v.angle);ctx.scale(v.dir,1);let width=v.length*512/440;
 // Fixed-size preblurred sprites. No live blur/filter, no per-particle simulation.
 if(quality!=='low'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha*.82;ctx.drawImage(bloomTexture(),-v.length,-h*.64,width,h*1.28)}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.drawImage(texture(),-v.length,-h/2,width,h);ctx.restore()}
 function geometry(sample,a,p){let w=p.wrists[1];return {x:sample.x+a.dir*w[0],y:550-sample.y+w[1],dir:a.dir,length:Math.min(CFG.tailMax,Math.abs(sample.x-a.sx)+82),handOffset:a.dir*w[0]}}
 function draw(ctx,sample,a,u,p,quality){paint(ctx,geometry(sample,a,p),smooth(u/CFG.fadeIn),quality)}
 function createTrail(){return {items:[],active:null,clear(){this.items.length=0;this.active=null},update(sample,a,u,p,t,range){
  if(a?.k==='q'){if(this.active!==a){this.active=a;this.items.push({action:a,start:t-a.t,end:t-a.t+a.duration,u:0,geometry:null});if(this.items.length>3)this.items.shift()}let item=this.items.at(-1);item.geometry=geometry(sample,a,p);item.u=u}
  else this.active=null;
  for(let item of this.items)if(t>=item.end&&item.geometry){let g=item.geometry;g.x=endX(item.action,range)+g.handOffset;g.length=Math.min(CFG.tailMax,Math.abs(g.x-g.handOffset-item.action.sx)+82)}
  this.items=this.items.filter(item=>t-item.end<CFG.trailLife);
 },draw(ctx,t,quality){for(let item of this.items){if(!item.geometry)continue;let alpha=t<item.end?smooth(item.u/CFG.fadeIn):1-smooth((t-item.end)/CFG.trailLife);paint(ctx,item.geometry,alpha,quality)}}}}

 return {CFG,envelope,echoes,draw,createTrail,drawLance:paint,prepare(){texture();bloomTexture()}};
})();
if(typeof module!=='undefined')module.exports=FairiDash;
