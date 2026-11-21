// Authored melee-R phases: flame9 -> flame2 -> explosion15.
(()=>{const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const assets={rise:{w:448,h:256,frames:25,hash:'2efa46c89a65',file:'r-rise09'},dive:{w:320,h:320,frames:25,hash:'720aab956829',file:'r-dive02'},slam:{w:640,h:640,frames:27,hash:'581085ac95bf',file:'r-slam15-soft'}};
for(const a of Object.values(assets)){a.image=new Image();a.image.decoding='async';a.image.src='/mox/assets/'+a.file+'.webp?v='+a.hash;}
function phase(age){return {rise:smooth(age/.12)*(1-smooth((age-.78)/.23)),dive:smooth((age-.78)/.2)*(1-smooth((age-1.20)/.08))};}
function frame(a,u){if(a.frames===25)return Math.min(24,Math.floor(Math.max(0,u)*25));const ends=[.08,.12,.16,.20,.24,.28,.32,.36,.40,.44,.48,.52,.56,.60,.64,.68,.72,.76,.80,.84,.92,.96,1,1.08,1.12,1.16,1.2];let k=ends.findIndex(t=>u*1.2<t);return k<0?26:k;}
function sprite(c,a,u,x,y,w,h,alpha=1,anchor=.5){if(alpha<.01||u>=1||!a.image.complete||!a.image.naturalWidth)return;const k=frame(a,u);c.save();c.globalAlpha*=alpha;c.drawImage(a.image,k%5*a.w,Math.floor(k/5)*a.h,a.w,a.h,x-w/2,y-h*anchor,w,h);c.restore();}
function travel(c,x,y,age,dir=1){if(age<0||age>=1.28)return;const p=phase(age);c.save();c.translate(x,y);c.scale(dir,1);c.save();c.rotate(-Math.PI/2);sprite(c,assets.rise,age/1.04,0,-8,350,200,p.rise);c.restore();sprite(c,assets.dive,Math.max(0,(age-.78)/.52),0,-15,270,270,p.dive);c.restore();}
function impact(c,x,y,elapsed){if(elapsed<0||elapsed>=1.2)return;sprite(c,assets.slam,elapsed/1.2,x,y,1500,1500,1,.80);}

window.MoxSlam={assets,phase,frame,travel,impact};})();
