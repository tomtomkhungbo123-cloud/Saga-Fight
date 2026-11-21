// Authored reference effect14: third row, second bordered panel.
(()=>{let texture;const C={frames:25,width:144,height:144,columns:5,duration:.38,asset:'/mox/assets/punch-glove14.webp?v=glove33'};
function prepare(){if(!texture){texture=new Image();texture.decoding='async';texture.src=C.asset;}return texture;}
function sample(u){return {frame:Math.min(24,Math.max(0,Math.floor(u*25))),visible:u>=0&&u<1};}
function draw(c,x,y,u){const s=sample(u);if(!s.visible)return;const im=prepare();if(!im.complete||!im.naturalWidth)return;c.save();c.globalAlpha*=Math.pow(Math.sin(Math.PI*u),.55);c.drawImage(im,s.frame%5*C.width,Math.floor(s.frame/5)*C.height,C.width,C.height,x-50,y-52,100,100);c.restore();}
window.MoxPunch={C,prepare,sample,draw};if(typeof Image==='function')prepare();})();
