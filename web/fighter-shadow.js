// Two small baked textures: no canvas blur/filter or per-frame gradient allocation.
(()=>{
const textures=new Map(),hovering=new Set(['thunder','cylast','aether']);
function texture(preview){const key=!!preview;if(textures.has(key))return textures.get(key);const image=document.createElement('canvas');image.width=160;image.height=48;const c=image.getContext('2d');c.translate(80,24);c.scale(1,.24);
 if(preview){const rim=c.createRadialGradient(0,0,9,0,0,76);rim.addColorStop(0,'rgba(225,212,144,.06)');rim.addColorStop(.54,'rgba(225,212,144,.13)');rim.addColorStop(1,'rgba(225,212,144,0)');c.fillStyle=rim;c.fillRect(-80,-100,160,200);}
 const shade=c.createRadialGradient(0,0,0,0,0,68);shade.addColorStop(0,'rgba(0,0,0,.63)');shade.addColorStop(.42,'rgba(0,0,0,.43)');shade.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=shade;c.fillRect(-80,-100,160,200);textures.set(key,image);return image;
}
function placement(f,surface){const height=Math.max(0,surface-f.y),spread=1/(1+height/350);return {x:f.x,y:surface+5,width:112*spread,height:30*spread,alpha:Math.max(.16,1-height/900)};}
function draw(context,f,surface=f.y,options={}){if(!hovering.has(f.type)||!Number.isFinite(f.x+f.y+surface))return;const p=placement(f,surface);context.save();context.globalAlpha*=p.alpha;context.drawImage(texture(options.preview),p.x-p.width/2,p.y-p.height/2,p.width,p.height);context.restore();}
window.FighterShadow=Object.freeze({draw,placement,isHovering:type=>hovering.has(type)});
})();
