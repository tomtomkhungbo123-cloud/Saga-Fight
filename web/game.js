'use strict';
window.SagaGameBuild='6.23.0';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),W=1600,H=1117,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Keep layout reads and static scenery out of the animation hot path.
const arenaBackground=$('arenaBackground'),backgroundContext=arenaBackground?.getContext?.('2d');
const separateBackground=typeof backgroundContext?.setTransform==='function';
let backdrop=null,backdropKey='',viewport=null,viewportDirty=true,renderScale=1;
let renderAverage=0,frameAverage=16.67,qualityClock=0,qualityHeadroom=0,slowWindows=0;
// Device-local rendering only; never serialized into combat/network state.
const GRAPHICS_PROFILES={auto:{pixels:1300000,scale:1},high:{pixels:1300000,scale:1},balanced:{pixels:850000,scale:.85},low:{pixels:480000,scale:.75}};
let graphicsQuality='auto',graphicsFps=60;
try{const v=JSON.parse(localStorage.getItem('saga.graphics.v1'));if(v){if(Object.hasOwn(GRAPHICS_PROFILES,v.quality))graphicsQuality=v.quality;if([30,60].includes(v.fps))graphicsFps=v.fps;}}catch{}
function setGraphics(quality=graphicsQuality,fps=graphicsFps,save=true){
 graphicsQuality=Object.hasOwn(GRAPHICS_PROFILES,quality)?quality:'auto';graphicsFps=Number(fps)===30?30:60;
 renderScale=1;qualityClock=qualityHeadroom=slowWindows=0;backdropKey='';invalidateViewport();
 $('graphicsQuality').value=graphicsQuality;$('graphicsFps').value=String(graphicsFps);
 $('graphicsNote').textContent=graphicsQuality==='auto'?'Tự cân độ phân giải theo tải máy. Giữ đầy đủ nhân vật và hiệu ứng.':'Áp dụng ngay: '+({high:'độ nét cao',balanced:'giảm độ phân giải vừa phải',low:'độ phân giải thấp để giảm tải GPU'}[graphicsQuality])+'. Giữ đầy đủ nhân vật và hiệu ứng.';
 if(save)try{localStorage.setItem('saga.graphics.v1',JSON.stringify({quality:graphicsQuality,fps:graphicsFps}));}catch{}
}
$('graphicsQuality').addEventListener('change',()=>setGraphics($('graphicsQuality').value));
$('graphicsFps').addEventListener('change',()=>setGraphics(graphicsQuality,$('graphicsFps').value));
setGraphics(graphicsQuality,graphicsFps,false);
function invalidateViewport(){viewportDirty=true;}
window.addEventListener('resize',invalidateViewport);window.addEventListener('orientationchange',invalidateViewport);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(invalidateViewport).observe(canvas);
function renderViewport(){if(viewportDirty||!viewport){const r=canvas.getBoundingClientRect();viewport={width:r.width,height:r.height};viewportDirty=false;}const profile=GRAPHICS_PROFILES[graphicsQuality],maxPixels=profile.pixels,area=viewport.width*viewport.height;const factor=Math.min(1,Math.sqrt(maxPixels/Math.max(1,area)))*profile.scale*renderScale;return {width:Math.max(1,Math.round(viewport.width*factor)),height:Math.max(1,Math.round(viewport.height*factor))};}
function tuneRender(cost,dt){renderAverage=renderAverage?renderAverage*.94+cost*.06:cost;frameAverage=frameAverage*.95+Math.min(80,dt*1000)*.05;if(graphicsQuality!=='auto')return;qualityClock+=dt;if(qualityClock<1)return;qualityClock=0;const budget=1000/graphicsFps;slowWindows=!document.hidden&&frameAverage>Math.max(27,budget*1.6)?slowWindows+1:0;if((renderAverage>budget*.72||slowWindows>=3)&&renderScale>.65){renderScale=Math.max(.65,renderScale-.1);qualityHeadroom=0;slowWindows=0;}else if(renderAverage<budget*.36&&frameAverage<budget*1.2&&renderScale<1){if(++qualityHeadroom>=5){renderScale=Math.min(1,renderScale+.05);qualityHeadroom=0;}}else qualityHeadroom=0;}
function textIfChanged(node,value){if(node.textContent!==value)node.textContent=value;}

const art={},map=new Image();map.src='assets/arena.png';for(const k of ['idle','charge','shoot','lift','slam','dash','appear','ultimate']){art[k]=new Image();art[k].src='assets/'+k+'.png?v=11';}
const names={thunder:'THUNDER STANCE',soul:'SOULBLADE',cylast:'CYLAST',mox:'MOX',melanta:'MELANTA',fairi:'FAIRI'},colors={thunder:'#f5db8b',soul:'#ff637d',cylast:'#a3cee5',mox:'#ff984e',melanta:'#c78bea',fairi:'#81e9dd'},moveNames={fairi:['Song dao','Phi tiên','Làn sương tiên lữ','Ảo cảnh mơ màng','Ngũ kích tất sát'],melanta:['Phi đà','Tử đằng giáng','Phi đà trói buộc','Ảnh vũ','Vũ điệu gai tím'],mox:['Hỏa quyền','Chuyển dạng','Song hỏa cầu','Lướt ảnh','Thiên giáng / Tứ hỏa truy kích'],thunder:['Lôi kích','Lôi đạn','Thiên lôi chấn','Lôi ảnh bộ','Thiên phạt'],cylast:['Băng tiễn','Quang băng','Mưa băng','Sương hộ mệnh','Bão tuyết'],soul:['Huyết trảm','Vũ điệu','Ảnh kiếm','Hồn nhập kiếm','Huyết nguyệt']},moves=['attack','q','w','e','r'];
const platforms=[{x:462,r:594,y:652},{x:765,r:930,y:491},{x:950,r:1087,y:766}];
const floorPoints=[[0,972],[120,950],[330,946],[510,970],[620,962],[725,934],[850,916],[1050,913],[1240,937],[1420,968],[1600,972]];
function floor(x){for(let i=1;i<floorPoints.length;i++)if(x<=floorPoints[i][0]){let a=floorPoints[i-1],b=floorPoints[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return 972;}
let fighters=[],effects=[],shots=[],keys={},time=0,remaining=99,countdown=0,finishLeft=0,phase='menu',mode='pve',difficulty='normal',score=[0,0],round=1,last=0,shake=0,aiClock=0,pausedFrom='fight',fps=60;
const COMBO_FADE=.8;
const FINISH_CONFIG={duration:3,speed:.18,melantaTimeline:2};window.SagaFinishConfig=FINISH_CONFIG;
function syncKOVisual(){if(rollbackDriving)return;const active=['finishing','roundover','matchover'].includes(phase)||phase==='paused'&&pausedFrom==='finishing';// A shared local-PvP canvas cannot filter only one viewer.
 $('arena').classList.toggle('ko-scene',active&&mode!=='pvp'&&fighters[localId()]?.hp<=0);}
const sandboxTuning={buffer:.15,extensions:2,controlBudget:3};
let sandboxOptions={free:true,ai:false,defend:false,distance:150},sandboxStats={total:0,hits:0,first:null};
function alternateFighter(f){return f.id===1&&fighters[0]?.type===f.type;}
function fighterColor(f){if(f.hp<=0)return '#999999';return alternateFighter(f)&&window.FighterPalette?window.FighterPalette.color(colors[f.type],f.type):colors[f.type];}
function fighterContext(f){if(f.hp<=0&&window.FighterPalette)return window.FighterPalette.context(ctx,'defeated');return alternateFighter(f)&&window.FighterPalette?window.FighterPalette.context(ctx,f.type):ctx;}
function tallySkillHit(f,e,dealt,use,meta){if(dealt<=0||!(f.type==='fairi'||f.type==='melanta'||f.type==='cylast'||f.type==='mox'&&use.k==='r')||meta.reflected||meta.reflection)return;if(meta.dot&&!meta.skillHit)return;const table=f.skillChains??={};let s=table[use.id];if(!s){s=table[use.id]={id:use.id,k:use.k,count:0,total:0,last:time};const ids=Object.keys(table);if(ids.length>8)delete table[ids[0]];}f.skillChain=s;s.count++;s.total+=dealt;s.last=time;if(meta.skillHit&&f.combo.active&&e.lockBudget?.owner===f.id&&actionLock(e)>time+1e-7){const c=f.combo;c.count++;c.total+=dealt;c.last=time;if(c.count>=5){c.display=c.count;c.displayDamage=c.total;c.fadeAt=actionLock(e);}}}
const HIT_METER_CONFIG={hold:1,fade:.4,pulse:.12};window.SagaHitMeterConfig=HIT_METER_CONFIG;
const meterViews=[{},{}];
function beginHitMeter(f,target,comboId=null){if(predicting)return f.hitMeter;return f.hitMeter={serial:f.hitSerial=(f.hitSerial||0)+1,target,comboId,startedAt:time,active:comboId!==null,hits:0,damage:0,shield:0,last:time,endedAt:comboId===null?time:null};}
function finishHitMeter(f){if(predicting)return;const h=f.hitMeter;if(h?.active){h.active=false;h.endedAt=time;hitMeterHUD();}}
function recordHitMeter(f,e,lost,absorbed){if(lost<=0&&absorbed<=0)return;const continuous=f.combo.active&&e.lockBudget?.owner===f.id&&actionLock(e)>time+1e-7,id=continuous?f.combo.id:null;let h=f.hitMeter;if(!h||!h.active||h.target!==e.id||h.comboId!==id)h=beginHitMeter(f,e.id,id);if(lost>0){h.hits++;h.damage=Math.round((h.damage+lost)*1e6)/1e6;}h.shield=Math.round((h.shield+absorbed)*1e6)/1e6;h.last=time;hitMeterHUD();}
function hitMeterHUD(){if(predicting||rollbackDriving)return;const now=typeof performance==='object'?performance.now()/1000:time;for(const f of fighters){const box=$('hitMeter'+f.id),h=f.hitMeter,v=meterViews[f.id];if(!box)continue;if(!h||!['fight','finishing','paused','roundover','matchover'].includes(phase)){box.hidden=true;v.serial=null;continue;}if(v.serial!==h.serial||v.start!==h.startedAt){v.serial=h.serial;v.start=h.startedAt;v.end=null;v.hits=-1;v.damage=-1;v.shield=-1;}if(v.hits!==h.hits||v.damage!==h.damage||v.shield!==h.shield){v.hits=h.hits;v.damage=h.damage;v.shield=h.shield;v.changed=now;textIfChanged($('hitCount'+f.id),h.hits+' HIT');textIfChanged($('hitDamage'+f.id),Number(h.damage.toFixed(2))+' DAMAGE');textIfChanged($('hitShield'+f.id),h.shield>0?Number(h.shield.toFixed(2))+' SHIELD':'');}if(h.active)v.end=null;else v.end??=now;const alpha=h.active?1:clamp(1-(now-v.end-HIT_METER_CONFIG.hold)/HIT_METER_CONFIG.fade,0,1);box.hidden=alpha<=0;box.style.opacity=String(alpha);box.style.transform='scale('+(1+.07*Math.max(0,1-(now-v.changed)/HIT_METER_CONFIG.pulse))+')';}}
function comboHUD(){for(const f of fighters){const c=f.combo,popup=$('combo'+f.id),alpha=c?.display>=5?clamp(1-(time-c.fadeAt)/COMBO_FADE,0,1):0;popup.hidden=!['fight','finishing','paused'].includes(phase)||alpha<=0;if(!popup.hidden){popup.classList.toggle('combo-ten',c.display>=10);popup.classList.toggle('combo-fifteen',c.display>=15);textIfChanged($('comboDamage'+f.id),Math.round(c.displayDamage)+' SÁT THƯƠNG');textIfChanged($('comboCount'+f.id),String(c.display));textIfChanged($('comboLabel'+f.id),(f.id?(mode==='pve'?'CPU':'P2'):'P1'));popup.style.opacity=String(alpha);popup.style.color=fighterColor(f);popup.style.transform='scale('+(1+Math.max(0,.16-(time-c.last))*.8).toFixed(3)+')';}}}
function clearComboHUD(){if(rollbackDriving)return;for(let i=0;i<2;i++){const node=$('hitMeter'+i);if(node)node.hidden=true;meterViews[i].serial=null;}for(let i=0;i<2;i++)$('combo'+i).hidden=true;}
function resetCooldowns(f){for(const k of moves)f.cd[k]=0;f.qRecharge=[];f.charges=f.fairi?3:2;}
function resetSandbox(){const wasPaused=phase==='paused';setupRound();if(wasPaused)pause();}
function sandboxHUD(){const active=mode==='sandbox'&&!['menu','lobby'].includes(phase);$('sandboxPanel').hidden=!active;if(!active)return;textIfChanged($('sandboxDamage'),String(Math.round(sandboxStats.total)));textIfChanged($('sandboxHits'),String(sandboxStats.hits));textIfChanged($('sandboxDps'),sandboxStats.first===null?'0':String(Math.round(sandboxStats.total/Math.max(1,time-sandboxStats.first))));const player=fighters[0],enemy=fighters[1];textIfChanged($('trainingStun'),Math.max(0,actionLock(enemy)-time).toFixed(3)+'s');textIfChanged($('trainingScale'),Math.round((player.combat.activeUse?.scalingUse===false&&player.combo.active?COMBAT_CONFIG.scaling[Math.min(Math.max(0,player.combo.uses-1),5)]:player.combat.activeUse?.scale??1)*100)+'% → '+Math.round((player.combo.active?COMBAT_CONFIG.scaling[Math.min(player.combo.uses,5)]:1)*100)+'%');textIfChanged($('trainingPoints'),player.combo.points+' / '+combatTuning().extensions);textIfChanged($('trainingDamage'),Math.round(player.combo.total));textIfChanged($('trainingTrue'),player.combo.active?'TRUE COMBO':player.combo.reason);textIfChanged($('trainingGaps'),String(sandboxStats.gaps||0));}
// Timings are seconds on the fixed 120Hz simulation clock, independent of paint FPS.
const COMBAT_CONFIG={buffer:.15,extensions:2,controlBudget:3,bleed:{duration:3,base:60,perStack:.03,maxStacks:10},shatterBonus:1.1,soulQRepeatDelay:.3,cylastNormalSpeed:600,soulQHits:[.12,.27,.42,.57],escapeProtection:.35,fade:.8,scaling:[1,.95,.85,.75,.65,.5],
 normals:{
 fairi:{range:125,height:180,damage:[38,38,38],startup:[.12,.13,.18],duration:[.36,.38,.48],stun:[.25,.27,.25],cancelTo:['q','w','e','r']},
 melanta:{range:300,height:205,damage:[60,60,60],startup:[.12,.12,.12],duration:[.5,.5,.5],stun:[.22,.24,.25],cancelTo:['q','w','e','r']},
 soul:{range:200,height:205,damage:[65,65,84.5],startup:[.12,.13,.18],duration:[.32,.35,.50],stun:[.27,.32,.28],cancelTo:['q']},
 thunder:{range:600,height:125,damage:[28,28,36.4],startup:[.10,.12,.18],duration:[.34,.36,.52],stun:[.24,.27,.25],cancelTo:['q','w','e']},
 mox:{range:300,height:205,damage:[75,75,97.5],startup:[.12,.14,.18],duration:[.36,.40,.55],stun:[.28,.32,.30],cancelTo:['w','r']},
 moxRanged:{range:700,height:205,damage:[60,60,78],startup:[.12,.14,.18],duration:[.48,.50,.65],stun:[.24,.27,.25],cancelTo:['w']},
 cylast:{range:1000,height:205,damage:[65,65,84.5],startup:[.12,.14,.18],duration:[.38,.40,.55],stun:[.26,.29,.26],cancelTo:['q','w','r']}
 },
 specials:{
 fairi:{q:{range:340,role:"extend",cost:1,stun:.2,max:3,to:["attack","q","r"],window:[.2,.22]},w:{role:"utility",cost:0,stun:0,max:1},e:{role:"utility",cost:0,stun:0,max:1},r:{range:650,role:"finish",cost:0,stun:0,max:1}},
 melanta:{q:{role:"extend",cost:1,stun:1,max:1,to:["attack","r"],window:[.73,1.32]},w:{role:"open",cost:0,stun:0,max:1,to:["r"],window:[.8,1.05]},e:{role:"open",cost:0,stun:.15,max:1,to:["attack","r"],window:[.55,.78]},r:{role:"finish",cost:0,stun:0,max:1}},
 soul:{q:{range:400,role:'extend',cost:1,stun:.42,max:2,to:['attack','q','r'],window:[.58,.60]},w:{range:600,blinkRadius:260,role:'extend',cost:1,stun:.26,max:1},e:{role:'utility',cost:0,stun:0,max:1},r:{range:520,role:'finish',cost:0,stun:.3,max:1}},
 thunder:{q:{role:'extend',cost:1,stun:.24,max:1,to:['attack'],window:[.53,.70]},w:{range:360,role:'extend',cost:1,stun:.2,max:1},e:{travel:310,role:'utility',cost:0,stun:0,max:1,countsUse:true},r:{role:'extend',cost:1,stun:1.5,span:2.2,max:1}},
 mox:{q:{role:'utility',cost:0,stun:0,max:99},w:{role:'extend',cost:1,stun:.28,max:1},e:{role:'utility',cost:0,stun:0,max:1},r:{role:'finish',cost:0,stun:1,max:1}},
 cylast:{q:{role:'extend',cost:1,stun:1,span:1,max:1},w:{role:'zone',cost:0,stun:0,max:1},e:{role:'utility',cost:0,stun:0,max:1},r:{role:'zone',cost:0,stun:0,max:1}}
 }};
for(const cfg of Object.values(COMBAT_CONFIG.normals)){cfg.windows=cfg.startup.map((start,i)=>[start+.008,cfg.duration[i]]);cfg.chainTo=[2,3,null];cfg.roles=['open','link','finish'];cfg.maxUses=[1,1,1];}
window.SagaCombatConfig=COMBAT_CONFIG;
function combatTuning(){return mode==='sandbox'?sandboxTuning:COMBAT_CONFIG;}
function combatState(){return {serial:0,buffer:null,normalStep:0,lastNormal:null,activeUse:null,defendedHit:-99,seen:[],gapAt:null};}
function comboState(){return {active:false,id:0,count:0,total:0,uses:0,points:combatTuning().extensions,moves:{},display:0,displayDamage:0,last:-99,fadeAt:-99,reason:'Sẵn sàng'};}
function actionLock(f){return Math.max(f.hitstunUntil||0,f.stunUntil||0,f.freezeUntil||0,f.knockdownUntil||0,f.grabbedBy!=null?(f.lockBudget?.reservedUntil||time+.01):0);}
function endCombo(f,reason='Có khe hở'){const c=f.combo;if(!c)return;if(c.active){finishHitMeter(f);c.completedHits=c.count;c.completedDamage=c.total;}c.active=false;c.count=0;c.reason=reason;c.fadeAt=Math.min(c.fadeAt,time);if(f.combat)f.combat.normalStep=0;}
function reconcileCombos(){for(const f of fighters){const e=fighters[1-f.id];if(f.combo.active&&(e.lockBudget?.owner!==f.id||actionLock(e)<=time+1e-7)){if(e.lockBudget?.deadline<=time+1e-7){e.escapeUntil=Math.max(e.escapeUntil||0,time+COMBAT_CONFIG.escapeProtection);e.escapeUse=null;e.knockVx=f.dir*420;}endCombo(f,'Đối thủ đã có thể phòng thủ');}}}
function startCombo(f,e){const old=f.combo;f.combo={...comboState(),id:old.id+1,active:true,reason:'TRUE COMBO',display:old.display,displayDamage:old.displayDamage,fadeAt:old.fadeAt,last:old.last};f.combat.normalStep=0;beginHitMeter(f,e.id,f.combo.id);e.lockBudget={owner:f.id,start:time,deadline:time+combatTuning().controlBudget,reservedUntil:time};return f.combo;}
function specFor(f,k){if(k==='attack')return null;return COMBAT_CONFIG.specials[f.type][k];}
function newUse(f,k,n=0){const c=f.combo,s=specFor(f,k),utility=s?.role==='utility'&&!s.countsUse,order=c.active&&!utility?c.uses+1:1;return {id:f.id+':'+(++f.combat.serial),k,n,form:f.mox?.p.form||0,order,scale:utility?1:COMBAT_CONFIG.scaling[Math.min(order-1,5)],session:c.active?c.id:null,confirmed:false,costPaid:false,committed:false,scalingUse:!utility,role:k==='attack'?normalConfig(f).roles[n-1]:s.role,cost:s?.cost||0,stun:k==='attack'?normalConfig(f).stun[n-1]:s.stun,max:s?.max||1,relaunch:!!s?.relaunch,hitIndex:0,spawned:time};}
function commitUse(f,use){const c=f.combo;if(use.scalingUse===false){if(c.active&&!use.committed){use.committed=true;use.session=c.id;c.moves[use.k]=(c.moves[use.k]||0)+1;}return;}if(!c.active)return;if(use.committed&&use.session===c.id)return;const locked=use.committed;use.committed=true;use.session=c.id;use.order=c.uses+1;if(!locked)use.scale=COMBAT_CONFIG.scaling[Math.min(use.order-1,5)];c.uses++;const key=use.k==='attack'?'n'+use.n:use.k;c.moves[key]=(c.moves[key]||0)+1;}
function prepareHit(f,e,use,dot=false){if(dot)return;if(f.combo.active&&(actionLock(e)<=time+1e-7||e.lockBudget?.owner!==f.id))endCombo(f);if(!f.combo.active)startCombo(f,e);commitUse(f,use);}
// Damage armor suppresses ordinary flinch/push only; explicit CC retains its rules.
function damageArmor(f){const k=f.action?.k;return !!(f.fairi&&['q','w','e','r','ambush'].includes(f.action?.k)||f.melanta&&['w','e'].includes(f.melanta.a?.k)||f.type==='thunder'&&['e','r'].includes(k)||f.type==='soul'&&k==='r'||f.type==='cylast'&&['w','r'].includes(k)||f.type==='mox'&&f.mox?.action?.k==='r');}
function hitReaction(f,e,use,duration=use.stun){if(damageArmor(e))return false;if(duration<=0||use.role==='utility'||use.role==='zone'||!canControl(e,use))return false;
 const c=f.combo,b=e.lockBudget;if(!b||b.owner!==f.id)return false;let left=Math.max(0,b.deadline-time);
 if(!use.costPaid&&use.role==='extend'){use.costPaid=true;const cost=use.cost+(use.relaunch?1:0);if(c.points<cost)use.endOnly=true;else c.points-=cost;}
 if(use.span&&!use.reserved){use.reserved=true;if(left+1e-7<use.span)use.endOnly=true;}
 if(left<duration-1e-7&&!use.reserved)use.endOnly=true;
 if(use.endOnly)duration=Math.min(.18,left);else duration=Math.min(duration,left);
 if(duration>0){if(e.freezeBy&&e.freezeBy.useId!==use.id)e.freezeBy.afterHitstun=Math.max(e.freezeBy.afterHitstun||0,time+duration);e.hitstunUntil=Math.max(e.hitstunUntil||0,time+duration);b.reservedUntil=Math.max(b.reservedUntil,time+duration);e.queue=[];e.combat.buffer=null;e.jumpUntil=0;e.move=0;e.vx=0;interruptFighter(e);}
 return duration>0;
}
function finishUse(f,e,use,knock=360){if(!canControl(e,use)){use.terminal=true;endCombo(f,'Đối thủ miễn khống chế');return;}const until=Math.max(time+.18,actionLock(e));if(!damageArmor(e))e.knockVx=f.dir*knock;if(!damageArmor(e)&&e.grabbedBy==null&&e.y<floor(e.x)-5)e.vy=Math.max(e.vy,420);e.escapeUntil=Math.max(e.escapeUntil||0,until+COMBAT_CONFIG.escapeProtection);e.escapeUse=use.id;use.terminal=true;endCombo(f,'Kết thúc combo');}
function recordCombo(source,target,dealt,use,meta){if(dealt<=0||meta.dot||meta.utility||use.role==='zone'||use.role==='utility'||use.terminal)return;const c=source.combo;c.count++;comboSound(source);c.total=Math.round((c.total+dealt)*1000000)/1000000;c.last=time;use.confirmed=true;if(use.k==='attack'){source.combat.normalStep=use.n;source.combat.lastNormal=use;}if(c.count>=5){c.display=c.count;c.displayDamage=c.total;c.fadeAt=Math.max(time,actionLock(target));}endCombo(target,'Bị phản công');}
function normalConfig(f){return COMBAT_CONFIG.normals[f.type==='mox'&&f.mox.p.form?'moxRanged':f.type];}
function cancelReady(f,k){const n=f.normal;if(n)return !!(n.use.confirmed&&n.n<3&&normalConfig(f).cancelTo.includes(k)&&n.age>=normalConfig(f).windows[n.n-1][0]&&resourceReady(f,k));const a=f.action,s=a&&specFor(f,a.k);return !!(s?.to?.includes(k)&&a.use?.confirmed&&a.age>=s.window[0]&&a.age<=s.window[1]&&resourceReady(f,k));}
function resourceReady(f,k){if(f.fairi)return window.FairiCombat.ready(f,k);if(k==='attack')return true;if(k==='q'&&f.type==='soul')return f.charges>0&&f.cd.q<=1e-7;if(f.cd[k]>1e-7)return false;if(f.type==='soul'&&k==='w'&&f.blade&&f.blade.age<.3)return false;if(f.frost&&k==='w'&&f.frost.zones.some(z=>z.k==='w'))return false;return true;}
function legalCount(f,k,n){const c=f.combo;if(!c.active)return true;const key=k==='attack'?'n'+n:k;return (c.moves[key]||0)<(k==='attack'?normalConfig(f).maxUses[n-1]:specFor(f,k).max);}
function startNormal(f,n){const cfg=normalConfig(f),use=newUse(f,'attack',n);commitUse(f,use);const a={k:'attack',n,age:0,startup:cfg.startup[n-1],duration:cfg.duration[n-1],cancel:cfg.duration[n-1],fired:false,dir:f.dir,use};f.normal=a;f.action=a;f.combat.activeUse=use;f.cd.attack=a.duration;if(f.type==='soul')combatSound('soulblade_slash_'+n,f.x);
 if(f.mox){const g=f.mox;g.action=null;g.buffer=null;g.anim={k:'attack',t:0,form:g.p.form,hand:n===2?1:0};if(!g.p.form)g.nextHand=n===2?0:1;}
 if(f.melanta)window.MelantaCombat.startNormal?.(f,n,use);if(f.frost)f.frost.animation={k:'attack',age:0,cast:a.startup,recovery:a.duration-a.startup};return true;}
function closeNormal(f){f.normal=null;f.action=null;if(f.mox){f.mox.action=null;f.mox.buffer=null;}if(f.frost)f.frost.animation=null;}
function begin(f,k){if(k==='attack'&&f?.fairi?.stealth>0&&phase==='fight'&&!isStunned(f)&&f.hp>0){f.combat.launching=newUse(f,'attack',1);const ok=window.FairiCombat.ambush(f,moxEnv(f));if(ok){commitUse(f,f.combat.launching);f.combat.activeUse=f.combat.launching;f.combat.launching=null;return true}f.combat.launching=null;}if(phase!=='fight'||isStunned(f)||f.hp<=0||fighters[1-f.id]?.hp<=0)return false;reconcileCombos();const a=f.action,norm=f.normal,c=f.combo;let chain=false,n=1;
 if(k==='attack'){if(norm){const open=normalConfig(f).windows[norm.n-1][0];if(!norm.use.confirmed||norm.n===3||norm.age+1e-7<open||norm.age>norm.duration)return null;n=normalConfig(f).chainTo[norm.n-1];chain=true;}else if(a){const s=specFor(f,a.k);if(!s?.to?.includes('attack')||!a.use?.confirmed||a.age<s.window[0]||a.age>s.window[1])return null;n=Math.min(3,(f.combat.normalStep||0)+1);chain=true;}else if(c.active&&f.combat.normalStep>0)n=Math.min(3,f.combat.normalStep+1);
  if(!legalCount(f,k,n))return false;if(!chain&&f.cd.attack>1e-7)return null;
  if(norm)closeNormal(f);else if(a){f.action=null;if(f.mox)f.mox.action=null;}return startNormal(f,n);
 }
 if(!resourceReady(f,k))return f.cd[k]<=combatTuning().buffer?null:false;if(!(f.type==='soul'&&k==='w'&&f.blade)&&!legalCount(f,k,0))return false;
 if(norm){if(!norm.use.confirmed||norm.n===3||!normalConfig(f).cancelTo.includes(k)||norm.age+1e-7<normalConfig(f).windows[norm.n-1][0]||norm.age>norm.duration)return null;chain=true;}
 else if(a){const s=specFor(f,a.k);if(!s?.to?.includes(k)||!a.use?.confirmed||a.age<s.window[0]||a.age>s.window[1])return null;chain=true;}
 const oldNormal=norm,oldAction=a;const use=(f.type==='soul'&&k==='w'&&f.blade?.use)||newUse(f,k);const enemy=fighters[1-f.id];const spec=specFor(f,k);use.span=spec.span||0;if(f.type==='mox'&&k==='r'&&f.mox.p.form){use.stun=.26;use.span=.92;}
 if(f.type==='mox'&&k==='r'&&!f.mox.p.form){const left=enemy.lockBudget?.owner===f.id&&actionLock(enemy)>time?enemy.lockBudget.deadline-time:combatTuning().controlBudget;use.shortGrab=left<2.52;if(use.shortGrab)use.endOnly=true;}
 if(chain){if(norm)closeNormal(f);else f.action=null;if(f.melanta)f.melanta.a=null;}
 f.combat.launching=use;const ok=beginLegacy(f,k);f.combat.launching=null;
 if(!ok){if(chain){f.normal=oldNormal;f.action=oldAction;}return ok;}commitUse(f,use);f.combat.activeUse=use;if(f.action)f.action.use=use;if(f.mox?.action)f.mox.action.use=use;
 if(chain)combatSound('special_cancel',f.x);
 const castCue=f.type==='soul'?({q:'soulblade_q_spin',r:'soulblade_r_cast'})[k]:f.type==='thunder'?({w:'thunder_w_orb',e:'thunder_e_teleport'})[k]:f.type==='mox'&&k==='q'?'mox_transform':null;if(castCue)combatSound(castCue,f.x);
 if(f.type==='mox'&&k==='r'&&f.mox.action?.grab){prepareHit(f,enemy,use);enemy.lockBudget.reservedUntil=time+2.28;enemy.hitstunUntil=Math.max(enemy.hitstunUntil,time+1.52);endCombo(enemy,'Bị bắt');}
 return true;
}
function request(f,k){if(f?.melanta?.a?.k==='w'&&k==='r'&&f.cd.r<=0&&((f.melanta.a.locked&&f.melanta.a.t>=.6)||f.melanta.a.t>=.81)&&!f.melanta.a.hit){f.combat.buffer={k,until:time+.32};return;}if(!f||phase!=='fight'||f.hp<=0)return;if(isStunned(f)){if(moves.includes(k))f.combat.buffer={k,until:time+combatTuning().buffer};return;}if(k==='jump'){if(f.fairi&&f.action||f.melanta?.a||f.mox?.action?.grab||f.mox?.action?.k==='e'||f.rootUntil>time||(f.type==='cylast'&&f.action&&f.action.k!=='attack'))return;if(f.ground||f.jumps<2){f.vy=['cylast','mox'].includes(f.type)?-660:-900;f.ground=false;f.jumps++;combatSound('jump',f.x);emit('dust',f.x,f.y,colors[f.type],55);}else f.jumpUntil=time+.14;return;}if(!moves.includes(k))return;const result=begin(f,k);if(result===null)f.combat.buffer={k,until:time+combatTuning().buffer};else if(result)f.combat.buffer=null;}
function consumeBuffer(f){const b=f.combat.buffer;if(!b)return;if(b.until<time-1e-7){f.combat.buffer=null;return;}if(isStunned(f))return;const result=begin(f,b.k);if(result!==null)f.combat.buffer=null;}
function tickNormal(f,dt){if(f.melanta){const n=f.normal;n.age+=dt;window.MelantaCombat.normal(f,dt,moxEnv(f));if(n.age>=n.duration){f.normal=null;f.action=null;}return;}const a=f.normal;if(!a)return;a.age+=dt;f.action=a;const cfg=normalConfig(f);if(f.mox)f.mox.anim.t=a.age*.12/a.startup;
 if(!a.fired&&a.age+1e-7>=a.startup){a.fired=true;const damageValue=cfg.damage[a.n-1],use=a.use,e=fighters[1-f.id];
 if(f.type==='mox'&&use.form){combatSound('mox_shot',f.x);f.mox.balls.push({k:'basic',x:f.x+a.dir*52,y:-f.y+90,vx:a.dir*1350,range:648,originX:f.x,originY:-f.y,traveled:0,damage:damageValue,trail:[],use,hitId:use.id+':normal'});f.mox.effect('muzzle',f.x+a.dir*52,-f.y+90,.2);}
 else if(f.type==='cylast'){combatSound('cylast_normal',f.x);const tip=window.CylastBase.frostStaffTip({x:f.x,y:-f.y,vx:f.vx,dir:a.dir},f.frost.pose,time),dx=e.x-tip.x,dy=e.y-85+tip.y,aim=e.hp>0&&dx*a.dir>0&&Math.abs(dx)<=cfg.range?Math.atan2(dy,Math.abs(dx)):0;
 const frozen=e.hp>0&&e.freezeBy?.owner===f.id&&e.freezeUntil>time&&e.freezeBy.until>time&&Math.abs(e.x-f.x)<=cfg.range&&Math.abs(e.y-f.y)<=cfg.height&&(e.x-f.x)*a.dir>=-25;
 if(frozen){emit('frostLink',tip.x,-tip.y,colors.cylast,1,{toX:e.x,toY:e.y-85,life:.4});damage(f,e,damageValue,0,false,false,{use,hitId:use.id+':normal',last:true});}
 else{const speed=COMBAT_CONFIG.cylastNormalSpeed;shots.push({kind:'frost',owner:f.id,x:tip.x,y:-tip.y,vx:a.dir*speed*Math.cos(aim),vy:speed*Math.sin(aim),remaining:cfg.range,age:0,damage:damageValue,use,hitId:use.id+':normal'});}emit('frostMuzzle',tip.x,-tip.y,'#a3cee5',30,{life:.2});}
 else{combatSound(f.type==='fairi'?'soulblade_slash_'+a.n:f.type==='thunder'?'thunder_normal':'mox_melee',f.x);if(f.type==='thunder')emit('bolt',f.x+a.dir*25,f.y-110,colors.thunder,600,{toX:f.x+a.dir*600,toY:f.y-110,life:.28});if(f.mox)f.mox.effect('punch',f.x,-f.y+100,.22,{dir:a.dir,hand:f.mox.anim.hand,range:300});hit(f,cfg.range,damageValue,true,false,cfg.height,{use,hitId:use.id+':normal',last:true});}
 }if(a.age+1e-7>=a.duration){f.normal=null;if(f.action===a)f.action=null;}}
function dummyDefense(){const f=fighters[1];if(mode!=='sandbox'||!sandboxOptions.defend||isStunned(f))return;const c=fighters[0].combo;if(!c.active&&f.lastHurt>f.combat.defendedHit){f.combat.defendedHit=f.lastHurt;f.combat.gapAt=time;if(c.reason!=='Kết thúc combo')sandboxStats.gaps=(sandboxStats.gaps||0)+1;f.invulnUntil=time+.18;request(f,'jump');}}

// One host event per real cue; playback preferences never enter combat state.
let sfxSerial=0,sfxEvents=[],receivedSfx=0;
let rollbackDraw=[{x:0,y:0},{x:0,y:0}],rollbackPrevious=null,rollbackView=[null,null],rollbackTickBefore=null,rollbackAlpha=1;
let rollbackDriving=false,rollbackInputs=null,rollbackMessage=null,rollbackReady=[false,false],rollbackRng=1,rollbackCommitted=null,rollbackPlayed=0;
let predicting=false,simTick=0,predicted=null,predictionEnemy=null,predictionOffset={x:0,y:0};
function combatSound(id,x=800,options={}){if(predicting)return;const event={id,x,t:time,seq:++sfxSerial,...options};sfxEvents.push(event);if(sfxEvents.length>32)sfxEvents.shift();if(!rollbackDriving)window.sagaAudio?.play(id,event);}
function comboSound(f){if([5,10,15].includes(f.combo.count))combatSound('combo_'+f.combo.count,f.x);}
function clearCombatSound(){sfxEvents=[];if(!rollbackDriving)window.sagaAudio?.stopCombat();}
function receiveSound(s){const batch=s.sfx;if(!batch)return;for(const e of batch.events||[])if(e.seq>receivedSfx&&s.time-e.t<=.4&&s.time>=e.t&&['fight','countdown','finishing','roundover','matchover'].includes(s.phase))window.sagaAudio?.play(e.id,e);receivedSfx=Math.max(receivedSfx,batch.serial||0);}
function syncZoneSound(){window.sagaAudio?.syncMusic?.(['countdown','fight','finishing','roundover','matchover'].includes(phase)?'play':phase==='paused'?'pause':'off');const active=[];if(['fight','finishing'].includes(phase))for(const f of fighters)for(const z of f.frost?.zones||[])if(z.life>1e-8)active.push({key:z.use.id+':zone',id:z.k==='w'?'cylast_w_rain_loop':'cylast_r_storm_loop',x:z.x,age:z.age,life:z.life});window.sagaAudio?.syncZones?.(active,phase==='finishing'?.18:1);}
function makeFighter(type,id){const x=id?1230:340;return {fairi:type==='fairi'?window.FairiCombat.init():null,melanta:type==='melanta'?window.MelantaCombat.init():null,mox:type==='mox'?window.MoxCombat.init():null,turn:0,grabbedBy:null,immuneUntil:0,invulnUntil:0,knockVx:0,burn:null,frost:type==='cylast'?window.CylastCombat.init():null,freezeUntil:0,freezeBy:null,rootUntil:0,shield:0,shieldUntil:0,id,type,x,y:floor(x),vx:0,vy:0,dir:id?-1:1,hp:type==='fairi'?900:1000,lastHurt:-99,normal:null,combat:combatState(),combo:comboState(),hitstunUntil:0,knockdownUntil:0,escapeUntil:0,escapeUse:null,lockBudget:null,cd:{attack:0,q:0,w:0,e:0,r:0},qRecharge:[],charges:type==='fairi'?3:2,action:null,blade:null,queue:[],ground:true,jumps:0,jumpUntil:0,drop:0,flash:0,stun:0,stunUntil:0,bleed:[],gait:0,runWeight:0,airWeight:0,lean:0,hair:0,cloth:0,spinPhase:0,spinBlend:0,crossBlend:0,bladeAngle:0,move:0,pose:'idle',prevPose:'idle',poseBlend:1};}
let remoteMove=0,moxShake=0,cameraPan=0,cameraClock=0;
const SHAKE_CONFIG={limit:18,thunder:[10,11,15],soul:17,mox:18,moxRanged:8,moxRangedLast:11};
const cameraOffset={x:0,y:0};
const shakeMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function ultimateShake(type,index=0){const strength=type==='thunder'?SHAKE_CONFIG.thunder[index]:SHAKE_CONFIG[type];if(type==='mox')moxShake=Math.max(moxShake,strength||0);else shake=Math.max(shake,strength||0);}
function cameraShake(){const amplitude=shakeMotion?.matches||!['fight','finishing'].includes(phase)?0:Math.min(SHAKE_CONFIG.limit,Math.max(shake,moxShake));cameraOffset.x=Math.sin(time*91)*amplitude;cameraOffset.y=Math.cos(time*77)*amplitude*.6;return cameraOffset;}

function onlineActive(){return mode==='online'&&!!window.riftNet?.room;}
function onlineGuest(){return onlineActive()&&window.riftNet.role==='guest'&&!window.riftNet.fullRollback;}
function localId(){return onlineActive()&&window.riftNet.role==='guest'?1:0;}
function localAction(k){if(onlineActive())window.riftNet.action(k);else if(k==='drop'){const f=fighters[0];if(phase==='fight'&&!isStunned(f)){f.drop=.3;f.y+=15;}}else request(fighters[0],k);}
function focusGame(){canvas.focus({preventScroll:true});}
function updateCountdownBanner(){if(rollbackDriving)return;$('banner').hidden=!(phase==='countdown'||phase==='fight'&&countdown>0);$('banner').textContent=countdown>2.65?'3':countdown>1.65?'2':countdown>.65+1e-8?'1':'FIGHT';}
let melantaKiller=null;
function setupRound(){window.FairiVisual?.reset();window.MelantaVisual?.reset();window.FairiVisual?.reset();melantaKiller=null;clearCombatSound();clearComboHUD();sandboxStats={total:0,hits:0,first:null};document.body.classList.remove('paused');document.body.classList.add('playing');fighters=[makeFighter($('select0').value,0),makeFighter($('select1').value,1)];effects=[];shots=[];remaining=99;finishLeft=0;countdown=3.65;phase='countdown';syncKOVisual();keys={};aiClock=0;shake=0;moxShake=0;cameraPan=0;$('hud').hidden=false;$('menu').hidden=true;$('message').hidden=true;updateCountdownBanner();$('modeTag').textContent=mode==='pve'?'PvE / '+{easy:'DỄ',normal:'THƯỜNG',hard:'KHÓ',hell:'HELLMODE'}[difficulty]:mode==='online'?'ONLINE / PHÒNG '+(window.riftNet?.room||''):'PvP / CÙNG BÀN PHÍM';
if(mode==='sandbox'){fighters[0].x=450;fighters[1].x=450+sandboxOptions.distance;for(const f of fighters)f.y=floor(f.x);countdown=0;phase='fight';$('banner').hidden=true;$('modeTag').textContent='SANDBOX / LUYỆN TẬP';}configureHUD();hud();sandboxHUD();focusGame();}
function configureHUD(){textIfChanged($('clockFormat'),mode==='sandbox'?'TEST KỸ NĂNG':'BEST OF THREE');window.controlSettings?.refresh();for(const f of fighters){$('n'+f.id).textContent=names[f.type];$('label'+f.id).textContent=(f.id?(mode==='sandbox'?'MỤC TIÊU':mode==='pve'?'MÁY':'NGƯỜI CHƠI 2'):'NGƯỜI CHƠI 1')+(alternateFighter(f)?' · MÀU PHỤ':'');document.querySelectorAll('.fighterhud')[f.id].style.color=fighterColor(f);$('skills'+f.id).innerHTML=moves.map((k,i)=>`<button class="skill" data-fighter="${f.id}" data-skill="${k}" title="${moveNames[f.type][i]}"><b>${f.id?['↵','1','2','3','4'][i]:['SPC','Q','W','E','R'][i]}</b><span>READY</span></button>`).join('');}}
function start(){score=[0,0];round=1;difficulty=$('difficulty').value;setupRound();}
function menu(){shake=0;moxShake=0;cameraPan=0;clearCombatSound();clearComboHUD();$('sandboxPanel').hidden=true;if(window.riftNet?.room)window.riftNet.leave();document.body.classList.remove('paused');document.body.classList.remove('playing');finishLeft=0;phase='menu';syncKOVisual();keys={};$('message').hidden=true;$('menu').hidden=false;$('hud').hidden=true;$('banner').hidden=true;fighters=[makeFighter('thunder',0),makeFighter('soul',1)];fighters[0].x=1080;fighters[0].y=floor(1080);fighters[1].x=1380;fighters[1].y=floor(1380);effects=[];shots=[];}
function isStunned(f){return (f.hitstunUntil||0)>time||(f.knockdownUntil||0)>time||(f.stunUntil||0)>time||(f.freezeUntil||0)>time||f.grabbedBy!=null;}
function emit(type,x,y,color,size=60,extra={}){if(predicting)return;if(type==='iceBreak'||type==='bleedBurst')combatSound(type==='iceBreak'?'cylast_ice_shatter':'soulblade_bleed_explode',x);effects.push({type,x,y,color,size,age:0,life:.55,...extra});}
function applyBleed(source,target,use){const cfg=COMBAT_CONFIG.bleed;if(target.bleed.some(mark=>mark.id===use.id+':bleed'))return;combatSound('soulblade_bleed_apply',target.x);target.bleed.push({id:use.id+':bleed',until:time+cfg.duration,stacks:0,base:cfg.base,scale:use.scale,owner:source.id,use:{...use}});}
function creditBleedBurst(source,target,dealt){if(dealt<=0)return;const c=source.combo,continuous=c.active&&target.lockBudget?.owner===source.id&&actionLock(target)>time+1e-7;source.combat.lastBurst={hits:1,damage:dealt,at:time,comboId:continuous?c.id:null};if(!continuous)return;c.count++;comboSound(source);c.total=Math.round((c.total+dealt)*1000000)/1000000;c.last=time;if(c.count>=5){c.display=c.count;c.displayDamage=c.total;c.fadeAt=actionLock(target);}}
function breakOwnFreeze(source,target,use){const frozen=target.freezeBy;if(source.type!=='cylast'||use.k!=='attack'||!frozen||frozen.owner!==source.id||target.freezeUntil<=time||frozen.until<=time)return false;target.freezeBy=null;target.freezeUntil=0;if(target.hitstunUntil<=(frozen.holdUntil||0)+1e-7)target.hitstunUntil=Math.max(frozen.previousHitstun||0,frozen.afterHitstun||0);if(source.frost?.ice?.useId===frozen.useId)source.frost.ice=null;emit('iceBreak',target.x,target.y-100,'#a3cee5',1,{life:.55});return true;}
function expireStatuses(f){if(f.freezeBy&&(f.hp<=0||f.freezeUntil<=time))f.freezeBy=null;if(f.bleed.length)f.bleed=f.bleed.filter(mark=>f.hp>0&&fighters[mark.owner]?.hp>0);}
function damage(source,target,amount,knock=45,bleed=false,detonation=false,meta={}){if(predicting)return 0;
 if(target.fairi&&!meta.dot)window.FairiCombat.area(target,source,target.x,target.y,75,180,amount,0,meta.hitId||source.action?.use?.id||source.id+':'+time,moxEnv(target));
 const use=meta.use||source.combat.launching||source.action?.use||source.combat.activeUse||newUse(source,'attack',1);meta={...meta,dot:!!(meta.dot||detonation)};
 if(source.hp<=0||target.hp<=0||phase!=='fight'||!canHit(target)||(!meta.dot&&target.escapeUntil>time&&target.escapeUse!==use.id))return 0;
 const hitId=meta.hitId;if(hitId&&source.combat.seen.includes(hitId))return 0;if(hitId){source.combat.seen.push(hitId);if(source.combat.seen.length>128)source.combat.seen.shift();}
 const counted=!meta.dot&&!meta.utility&&!use.terminal&&use.role!=='zone'&&use.role!=='utility';if(counted)prepareHit(source,target,use);
 const shatter=!meta.dot&&!meta.reflected&&!meta.reflection&&!meta.utility&&breakOwnFreeze(source,target,use);if(shatter)amount*=COMBAT_CONFIG.shatterBonus;
 const reduced=target.type==='soul'&&target.action?.k==='e'&&target.action.age>=.5;
 if(target.melanta?.a?.k==='r')amount*=.8;amount=Math.round(amount*(meta.scaled?1:use.scale)*(reduced?.2:1)*1000000)/1000000;
 if(target.shieldUntil<=time)target.shield=0;const absorbed=Math.min(target.shield||0,amount);target.shield=Math.max(0,(target.shield||0)-absorbed);if(target.frost?.ward?.phase==='active'&&!target.shield)target.frost.ward.phase='fade';amount-=absorbed;
 const hpBefore=target.hp;const dealt=mode==='sandbox'?amount:Math.min(target.hp,amount);target.hp=Math.round(Math.max(mode==='sandbox'?1:0,target.hp-amount)*1000000)/1000000;
 if(dealt>0){target.lastHurt=time;if(counted)hitReaction(source,target,use);recordCombo(source,target,dealt,use,meta);tallySkillHit(source,target,dealt,use,meta);if(meta.bleedBurst)creditBleedBurst(source,target,dealt);if(mode==='sandbox'&&source.id===0&&hpBefore>target.hp){sandboxStats.first??=time;sandboxStats.total+=hpBefore-target.hp;sandboxStats.hits++;}}
 recordHitMeter(source,target,Math.max(0,hpBefore-target.hp),absorbed);
 if(target.hp<=0&&source.type==='melanta')melantaKiller=source.id;
 if(source.type==='soul'&&!meta.dot&&!meta.utility&&!meta.reflected&&!meta.reflection&&dealt>0)for(const mark of target.bleed)if(mark.owner===source.id&&mark.until>time)mark.stacks=Math.min(COMBAT_CONFIG.bleed.maxStacks,(mark.stacks||0)+1);
 if(!meta.bleedBurst)target.flash=.13;if(counted&&canControl(target,use)&&!damageArmor(target)&&dealt>0){target.vx+=source.dir*knock*3;target.x=clamp(target.x+source.dir*Math.min(10,knock*.15),50,W-50);if(target.ground&&target.vy===0)target.y=cylastEnv(source).surface(target.x,target.y);}
 emit('damage',target.x,target.y-220,colors[source.type],amount,{life:.85,text:absorbed?'GIÁP −'+Math.round(absorbed)+(amount?' · −'+Math.round(amount):''):'−'+Math.round(amount)+(reduced?' · 80%':'')});
 if(!meta.bleedBurst&&!['cylast','mox'].includes(source.type)){emit('spark',target.x,target.y-100,colors[source.type],90);shake=Math.max(shake,amount>150?11:3);}
 if(bleed&&dealt>0&&target.hp>0)applyBleed(source,target,use);if(target.hp<=0){const owner=target.freezeBy&&fighters[target.freezeBy.owner];if(owner?.frost?.ice&&owner.frost.ice.useId===target.freezeBy?.useId)owner.frost.ice=null;target.bleed=[];target.freezeBy=null;target.freezeUntil=0;}
 if(counted&&dealt>0&&(use.endOnly||use.role==='finish'&&meta.last!==false))finishUse(source,target,use,use.k==='attack'?420:360);
 if(dealt>0&&!meta.dot&&source.type==='mox'&&use.k==='r'&&use.form)ultimateShake(meta.last?'moxRangedLast':'moxRanged');
 if(absorbed>0&&!meta.dot)combatSound('block',target.x);if(dealt>0){if(source.type==='cylast'&&use.k==='w')combatSound('cylast_w_rain_hit',target.x,{owner:source.id});else if(!meta.dot)combatSound(source.type==='mox'&&(use.form||use.k==='w')?(use.form&&use.k==='r'?'mox_r_barrage_hit':'mox_bullet_hit'):'hit_'+(sfxSerial%3+1),target.x,{owner:source.id,pitch:.96+(sfxSerial%5)*.02});}return dealt;
}
function hit(f,range,amount,directional=false,bleed=false,height=205,meta={}){const e=fighters[1-f.id];if(e.fairi&&!predicting)window.FairiCombat.area(e,f,f.x,f.y,range,height,amount,directional?f.dir:0,meta.hitId||f.action?.use?.id||f.id+':'+time,moxEnv(e));if(Math.abs(e.x-f.x)<=range&&Math.abs(e.y-f.y)<=height&&(!directional||(e.x-f.x)*f.dir>=-25))return damage(f,e,amount,meta.use?.k==='attack'&&meta.use.n<3?0:amount*.5,bleed,false,meta);return 0;}
function canHit(f){return (f.invulnUntil||0)<=time;}
function canControl(f,use=null){return canHit(f)&&!(f.fairi&&(f.fairi.stealth>0||['q','r'].includes(f.action?.k)))&&!(['q','r'].includes(f.melanta?.a?.k))&&(f.immuneUntil||0)<=time&&(!(f.escapeUntil>time)||f.escapeUse===use?.id);}
function interruptFighter(f){if(f.fairi)window.FairiCombat.cancel(f,moxEnv(f));if(f.melanta)window.MelantaCombat.cancel(f,moxEnv(f));f.normal=null;f.combat.buffer=null;if(f.type==='soul'&&f.action?.k==='e')f.cd.e=8;if(f.mox)window.MoxCombat.cancel(f,moxEnv(f));else if(f.frost)window.CylastCombat.cancel(f);else f.action=null;f.queue=[];f.jumpUntil=0;}
function decoyProjectile(f,x0,y0,x1,y1,amount,key){const target=fighters[1-f.id];if(!target.fairi||predicting)return false;return window.FairiCombat.area(target,f,(x0+x1)/2,(y0+y1)/2+90,Math.abs(x1-x0)/2+28,Math.abs(y1-y0)/2+100,amount,0,key,moxEnv(target))>0;}
function moxEnv(f){return {projectile:(x0,y0,x1,y1,d,key)=>decoyProjectile(f,x0,y0,x1,y1,d,key),...cylastEnv(f),time,fighter:f,control:canControl,damageArmored:damageArmor,hittable:canHit,use:()=>f.combat.launching||f.action?.use||f.combat.activeUse,stunned:isStunned,interrupt:interruptFighter,stun:(enemy,duration,use)=>hardStun(enemy,duration,use,f),slam(){ultimateShake('mox');}};}
function cylastEnv(f){return {decoyArea:(x,y,r,h,d,key)=>{let e=fighters[1-f.id];if(e.fairi&&!predicting)return window.FairiCombat.area(e,f,x,y,r,h,d,0,key,moxEnv(e));return 0;},enemy:fighters[1-f.id],time,damage,shots,emit,canControl,cue:(id,x=f.x,options={})=>combatSound(id,x,{owner:f.id,...options}),freeze(enemy,duration,use,previousHitstun=0){if(!use?.endOnly&&canControl(enemy,use)){combatSound('cylast_q_freeze',enemy.x);enemy.freezeUntil=Math.min(time+duration,enemy.lockBudget?.deadline??time+duration);enemy.freezeBy={owner:f.id,useId:use.id,until:enemy.freezeUntil,holdUntil:enemy.hitstunUntil,previousHitstun,afterHitstun:0};enemy.combat.buffer=null;interruptFighter(enemy);}},interrupt:interruptFighter,surface(x,y){let v=floor(x);for(const p of platforms)if(x>=p.x&&x<=p.r&&p.y>=y-8)v=Math.min(v,p.y);return v;}};}
function beginLegacy(f,k){if(f.fairi)return window.FairiCombat.use(f,k,moxEnv(f));if(f.melanta)return window.MelantaCombat.use(f,k,moxEnv(f));if(isStunned(f)||f.hp<=0)return false;if(f.type==='mox')return window.MoxCombat.use(f,k,moxEnv(f));if(f.type==='cylast')return window.CylastCombat.begin(f,k,cylastEnv(f));if(k==='q'&&f.type==='soul'&&f.cd.q>1e-7)return f.cd.q<=combatTuning().buffer?null:false;if(k==='q'&&f.type==='soul'&&!f.charges)return f.qRecharge.length&&Math.min(...f.qRecharge)<=.16?null:false;if(!(k==='q'&&f.type==='soul')&&f.cd[k]>0)return f.cd[k]<=.16?null:false;if(f.action)return null;if(f.type==='soul'&&k==='w'&&f.blade?.age<.3)return null;
const a={k,age:0,fired:false,duration:.45,cancel:.2,dir:f.dir};
if(f.type==='soul'){
if(k==='attack'){f.cd.attack=.28;a.duration=.38;a.cancel=.15;}
if(k==='q'){f.charges--;f.qRecharge.push(5);f.cd.q=combatTuning().soulQRepeatDelay??COMBAT_CONFIG.soulQRepeatDelay;a.duration=.6;a.cancel=.26;}
if(k==='w'){if(f.blade){combatSound('soulblade_w_blink',f.x);emit('dust',f.x,f.y-80,colors.soul,100);f.x=f.blade.x;f.y=f.blade.y;f.vy=0;f.blade=null;f.cd.w=4;hit(f,specFor(f,'w').blinkRadius,120);emit('ring',f.x,f.y-70,colors.soul,260);a.k='warp';a.duration=.4;a.cancel=.15;a.fired=true;}else{f.vy=-500;f.ground=false;a.origin=f.x;a.duration=.52;a.cancel=.24;}}
if(k==='e'){a.duration=2.5;a.cancel=2.5;}
if(k==='r'){f.cd.r=12;f.vy=-760;f.ground=false;a.duration=10;a.cancel=10;a.diving=false;}
}else{
const data={attack:[.42,.34,.17],q:[2.4,.72,.53],w:[4.5,3,.53],e:[3.2,.38,.11],r:[9,1.55,1.24]}[k];[f.cd[k],a.duration,a.cancel]=data;
if(k==='w'){f.vy=-500;f.ground=false;a.cancel=3;a.diving=false;}
if(k==='e'){const ox=f.x;f.x=clamp(f.x+f.dir*specFor(f,'e').travel,50,W-50);f.y=Math.min(f.y,floor(f.x));emit('bolt',ox,f.y-95,colors.thunder,310,{toX:f.x,toY:f.y-95,life:.5});const e=fighters[1-f.id];if(e.x>=Math.min(ox,f.x)-30&&e.x<=Math.max(ox,f.x)+30&&Math.abs(e.y-f.y)<190)damage(f,e,22,0,false,false,{use:f.combat.launching,utility:true});a.fired=true;}
}
f.action=a;return true;}
function updateFighter(f,dt){expireStatuses(f);for(const k of moves)f.cd[k]=Math.max(0,f.cd[k]-dt);f.qRecharge=f.qRecharge.map(n=>n-dt);f.charges=Math.min(f.fairi?3:2,f.charges+f.qRecharge.filter(n=>n<=0).length);f.qRecharge=f.qRecharge.filter(n=>n>0);f.flash=Math.max(0,f.flash-dt);f.stun=Math.max(0,f.stun-dt);f.drop=Math.max(0,f.drop-dt);
const detonations=f.bleed.filter(mark=>mark.until<=time);f.bleed=f.bleed.filter(mark=>mark.until>time);for(const mark of detonations){const source=fighters[mark.owner],value=mark.base*(1+COMBAT_CONFIG.bleed.perStack*Math.min(COMBAT_CONFIG.bleed.maxStacks,mark.stacks||0))*mark.scale;damage(source,f,value,0,false,true,{use:mark.use,dot:true,scaled:true,bleedBurst:true,hitId:mark.id+':burst'});emit('bleedBurst',f.x,f.y-110,'#b92046',1,{life:.7,stacks:mark.stacks||0});}
if(f.blade){f.blade.age+=dt;if(f.blade.age>=3.3){f.blade=null;f.cd.w=4;}}
const normal=f.normal;if(f.fairi)window.FairiCombat.update(f,dt,moxEnv(f));if(normal)f.action=null;if(f.type==='cylast')window.CylastCombat.update(f,dt,cylastEnv(f));if(f.mox)window.MoxCombat.update(f,dt,moxEnv(f));if(f.melanta)window.MelantaCombat.update(f,dt,moxEnv(f));if(normal&&f.normal===normal){f.action=normal;tickNormal(f,dt);}consumeBuffer(f);if(f.fairi&&window.FairiCombat.scripted(f)){motionPose(f,dt);return;}if(f.melanta&&window.MelantaCombat.scripted(f))return;if(f.grabbedBy!=null||f.mox&&window.MoxCombat.scripted(f))return;
let a=f.action;if(a&&!f.normal&&!['cylast','mox','melanta','fairi'].includes(f.type)){a.age+=dt;if(f.type==='soul'){
if(a.k==='attack'&&!a.fired&&a.age>=.09){hit(f,200,65,true);a.fired=true;}
if(a.k==='e'&&!a.audioTransform&&a.age>=.5){a.audioTransform=true;combatSound('soulblade_e_mist',f.x);}
if(a.k==='q'){a.spinHits??=0;while(a.spinHits<COMBAT_CONFIG.soulQHits.length&&a.age+1e-7>=COMBAT_CONFIG.soulQHits[a.spinHits]){hit(f,specFor(f,'q').range,95/COMBAT_CONFIG.soulQHits.length,false,false,205,{use:a.use,hitId:a.use.id+':spin'+a.spinHits});a.spinHits++;}}
if(a.k==='w'&&!a.fired&&a.age>=.18){combatSound('soulblade_w_throw',f.x);const x=clamp(a.origin+a.dir*specFor(f,'w').range,50,W-50);f.blade={x,y:floor(x),from:f.x+a.dir*60,fromY:f.y-150,age:0,use:a.use};a.fired=true;}
if(a.k==='r'&&!a.fired&&a.age>=.5){a.diving=true;f.vy=1650;}
}else{
if(a.k==='attack'&&!a.fired&&a.age>=.1){const targetX=clamp(f.x+a.dir*600,20,W-20);emit('bolt',f.x+a.dir*25,f.y-110,colors.thunder,600,{toX:targetX,toY:f.y-110,life:.28});hit(f,600,28,true,false,125);a.fired=true;}
if(a.k==='q'&&!a.fired&&a.age>=.5){combatSound('thunder_q_bolt',f.x);shots.push({owner:f.id,x:f.x+a.dir*55,y:f.y-110,vx:a.dir*740,age:0,use:a.use,hitId:a.use.id+':orb'});a.fired=true;}
if(a.k==='w'&&a.age>=.36&&!a.fired){a.diving=true;f.vy=1350;}
if(a.k==='r'){if(!a.fired&&a.age>=.5){a.targetX=fighters[1-f.id].x;a.targetY=fighters[1-f.id].y;thunderStrike(f,a.targetX,a.targetY,100,a.use,0);a.fired=true;}if(!a.second&&a.age>=.85){thunderStrike(f,a.targetX,a.targetY,100,a.use,1);a.second=true;}if(!a.third&&a.age>=1.2){thunderStrike(f,a.targetX,a.targetY,100,a.use,2);a.third=true;}}
}if(a.age>=a.duration){if(a.k==='e'&&f.type==='soul')f.cd.e=8;f.action=null;}}

moveFighter(f,dt);
a=f.action;if(a?.diving&&!a.fired&&f.ground){if(f.type==='soul'){hit(f,specFor(f,'r').range,240,false,true,205,{use:a.use,last:true,hitId:a.use.id+':slam'});emit('soulSlam',f.x,f.y,colors.soul,520,{life:.8});ultimateShake('soul');}else{combatSound('thunder_w_stomp',f.x);thunderSlam(f,a.use);emit('slam',f.x,f.y,colors.thunder,360,{life:.65});}shake=Math.max(shake,13);a.fired=true;a.impactAge=a.age;a.cancel=a.age+.14;a.duration=a.age+.42;}
if(f.melanta&&f.normal)f.dir=f.normal.dir;motionPose(f,dt);}
function motionPose(f,dt){const a=f.action;const pace=Math.abs(f.vx)/430;f.gait+=dt*(2+pace*12);f.runWeight+=((f.ground?pace:0)-f.runWeight)*(1-Math.exp(-dt*9));f.airWeight+=((f.ground?0:1)-f.airWeight)*(1-Math.exp(-dt*12));f.lean+=(f.vx*f.dir/430*.13-f.lean)*(1-Math.exp(-dt*10));f.hair+=(-f.lean*.75-f.hair)*(1-Math.exp(-dt*7));f.cloth+=(-f.vx*.075-f.cloth)*(1-Math.exp(-dt*7));f.spinBlend+=((a?.k==='q'?1:0)-f.spinBlend)*(1-Math.exp(-dt*22));if(a?.k==='q')f.spinPhase+=dt*Math.PI*2/.6;f.bladeAngle=f.spinPhase*f.spinBlend;f.crossBlend+=((a?.k==='q'&&a.age>.16?1:0)-f.crossBlend)*(1-Math.exp(-dt*18));}
function moveFighter(f,dt){if(isStunned(f)||f.rootUntil>time||f.hp<=0){f.move=0;f.vx=0;}if(f.move)f.dir=f.move;const slow=f.action?.k==='e'&&f.type==='soul'?.55:f.action?.k==='r'?.5:1;const castLocked=f.type==='cylast'&&f.action&&f.action.k!=='attack';const target=(castLocked?0:f.move)*(f.fairi?330*(f.fairi.stealth>0?1.4:1):1)*(f.fairi?1:f.type==='mox'?(f.action?.k==='r'?0:f.action?.k==='w'?120:370):['cylast','melanta'].includes(f.type)?350:430)*(f.type==='mox'?1:slow)*(f.melanta?.speedUntil>time?1.35:1);f.vx+=(target-f.vx)*(1-Math.exp(-dt*(f.stun?4:13)));if(f.ground&&!f.move&&!f.fairi)f.vx=0;f.x=clamp(f.x+(f.vx+(f.knockVx||0))*dt,45,W-45);f.knockVx=(f.knockVx||0)*Math.exp(-dt*8);
const prevY=f.y;const wasGround=f.ground;f.vy+=(['cylast','mox'].includes(f.type)?1800:1900)*dt;f.y+=f.vy*dt;f.ground=false;let surface=floor(f.x);
if(f.drop<=0&&f.vy>=0)for(const plat of platforms)if(f.x>plat.x-8&&f.x<plat.r+8&&prevY<=plat.y+7&&f.y>=plat.y)surface=Math.min(surface,plat.y);
if(f.melanta&&wasGround&&f.drop<=0&&f.vy>=0&&Math.abs(surface-prevY)<=8&&surface-f.y<=8)f.y=Math.max(f.y,surface);
if(f.y>=surface&&f.vy>=0){f.y=surface;f.vy=0;f.ground=true;f.jumps=0;if(!wasGround){combatSound('land',f.x);emit('dust',f.x,f.y,'#b7a0af',45);}if(f.jumpUntil>time&&!isStunned(f)&&!(f.rootUntil>time)){f.vy=['cylast','mox'].includes(f.type)?-660:-900;f.ground=false;f.jumps=1;f.jumpUntil=0;combatSound('jump',f.x);}}}
function hardStun(enemy,duration,use=null,source=null){if(enemy.hp<=0||!canControl(enemy,use)||use?.role==='utility'||use?.endOnly)return;source??=fighters[1-enemy.id];use??=source.combat.activeUse||newUse(source,'r');if(!enemy.lockBudget||enemy.lockBudget.owner!==source.id)prepareHit(source,enemy,use);const until=Math.min(time+duration,enemy.lockBudget.deadline);if(until<=time)return;enemy.stunUntil=Math.max(enemy.stunUntil||0,until);enemy.combat.buffer=null;enemy.queue=[];enemy.jumpUntil=0;enemy.move=0;enemy.vx=0;interruptFighter(enemy);}
function thunderSlam(f,use=f.action?.use){cylastEnv(f).decoyArea(f.x,f.y,specFor(f,'w').range,205,115,(use||f.combat.activeUse)?.id+':stomp');const enemy=fighters[1-f.id];if(enemy.hp<=0||!canHit(enemy)||Math.abs(enemy.x-f.x)>specFor(f,'w').range||Math.abs(enemy.y-f.y)>205)return;const direction=Math.sign(enemy.x-f.x)||f.dir;use??=newUse(f,'w');damage(f,enemy,115,0,false,false,{use,hitId:use.id+':stomp'});if(canControl(enemy))enemy.x=clamp(enemy.x+direction*100,45,W-45);hardStun(enemy,.2,use,f);}
function thunderStrike(f,x,y,amount,use=f.combat.activeUse,index=0){ultimateShake('thunder',index);combatSound('thunder_r_strike',x);emit('bolt',x-65,80,colors.thunder,y,{toX:x,toY:y,life:.35,width:7});emit('spark',x,y-10,colors.thunder,130);const enemy=fighters[1-f.id];if(enemy.hp>0&&Math.abs(enemy.x-x)<110&&Math.abs(enemy.y-y)<220){const token=use||newUse(f,'r');damage(f,enemy,amount,70,false,false,{use:token,hitId:token.id+':shock'+index,last:index===2});hardStun(enemy,1.5,token,f);}}
// PvE controller: observations are delayed; only own confirmed hits bypass perception latency.
// This controller sends ordinary requests, never mutates combat outcomes or opponent state.
// 5x response/decision tempo relative to6.8; combat animation and physics stay unchanged.
const AI_CONFIG={
 easy:{reaction:[.09,.14],think:.032,hold:[.14,.22],rest:[.13,.21],chain:3,miss:.054,defend:.72,evade:.52,pressure:.91},
 normal:{reaction:[.05,.09],think:.024,hold:[.12,.18],rest:[.076,.134],chain:5,miss:.028,defend:.84,evade:.42,pressure:.96},
 hard:{reaction:[.03,.06],think:.020,hold:[.10,.16],rest:[.05,.096],chain:6,miss:.016,defend:.92,evade:.34,pressure:.985},
 hell:{reaction:[.02,.036],think:.016,hold:[.09,.14],rest:[.036,.072],chain:7,miss:.01,defend:.96,evade:.28,pressure:.995}
};
// Preferences are ratios of live combat geometry, not copies of balance numbers.
const AI_STYLES={
 thunder:{stand:.72,near:.43,open:{attack:2.8,q:1.1,w:.8,r:.35},escape:['e'],combo:['attack','q','w']},
 soul:{stand:.78,near:.35,open:{attack:3.0,q:1.0,w:.55,r:.35},escape:['e'],combo:['attack','q','r']},
 cylast:{stand:.50,near:.30,open:{attack:1.5,q:1.5,w:1.25,r:.7},escape:['e'],combo:['attack','q','w','r']},
 mox:{stand:.72,near:.38,open:{attack:2.8,w:1.1,r:.55},escape:['e'],combo:['attack','w','r']},
 moxRanged:{stand:.62,near:.35,open:{attack:2.4,w:1.2,r:.55},escape:['e'],combo:['attack','w']},
 fairi:{stand:.75,near:.35,open:{attack:2.3,q:1.4,w:.75,e:.8,r:.7},escape:['q','w','e'],combo:['attack','q','r']},
 melanta:{stand:.85,near:.40,open:{attack:2.1,q:1.25,w:.8,r:.6},escape:['e'],combo:['attack','q','r']}
};
let aiDebugEnabled=false,aiDebugClock=0;
function aiRand(a,b){return a+(b-a)*Math.random();}
function aiStyle(f){return AI_STYLES[f.type==='mox'&&f.mox.p.form?'moxRanged':f.type];}
function aiRanges(f){const n=normalConfig(f).range,c=window.CylastBase?.CYLAST_SKILLS,L=window.MelantaLab;
 // Effective selection ranges are deliberately inside hitboxes. Long-range projectile travel
 // and startup still allow misses; the controller never extends hitstun or moves a target.
 if(f.fairi)return {attack:n,q:340,w:650,e:480,r:650};if(f.type==='thunder')return {attack:n,q:n*.92,w:specFor(f,'w').range*.88,e:specFor(f,'e').travel,r:n*.95};
 if(f.type==='soul')return {attack:n,q:specFor(f,'q').range*.9,w:specFor(f,'w').range,e:0,r:specFor(f,'r').range*.9};
 if(f.type==='cylast')return {attack:n,q:c.q.range,w:n,r:c.r.range*.9,e:0};
 if(f.type==='mox')return {attack:n,w:window.MoxBase.MOX_W_RANGE,r:(f.mox.p.form?window.MoxBase.MOX_R_RANGE.ranged:window.MoxBase.MOX_R_RANGE.melee)*.95,e:n};
 return {attack:n,q:L.Q_REACH+L.Q_RADIUS*.8,w:L.SKILLS.w.range*.95,e:L.SKILLS.e.range,r:L.SKILLS.r.range*.96};
}
function aiState(f){return f.pveAI??=( {state:'observe',reason:'Đọc tình huống',chosen:'—',until:time,nextThink:time,reaction:aiRand(...(AI_CONFIG[difficulty]||AI_CONFIG.normal).reaction),sampleAt:time,observations:[],seen:null,lastAction:null,lastGround:true,habits:{total:0,jumps:0,projectiles:0,approaches:0},lastUse:null,linked:null,burst:0,wasBusy:false,restUntil:0,evadeAt:0,jumpAt:0,lastThreat:null,recent:[],nextForm:time+.15,feintAt:time+3,stuckAt:time,stuckX:f.x,move:0,lastMove:0,trace:[],stats:{decisions:0,accepted:0,links:0,defenses:0,rejected:0,directionChanges:0}}
 );}
function aiObserve(f,e,s,c){if(time>=s.sampleAt){s.sampleAt=time+.016;
 const a=e.action,token=a?`${a.k}:${Math.round((time-a.age)*10)}`:null;
 // Read visible action/position/projectiles only. No player keys, buffer or planned commands.
 const bullets=[];let projectile=false;
 for(const p of shots)if(p.owner===e.id&&Math.abs(p.x-f.x)<760&&bullets.length<6){bullets.push({id:p.hitId||'shot:'+p.owner+':'+p.age,x:p.x,y:p.y,vx:p.vx||0,vy:p.vy||0});projectile=true;}
 if(e.mox){s.ballSamples??={};for(const p of e.mox.balls){const id=p.hitId||p.k+':'+Math.round((time-p.age)*100),old=s.ballSamples[id],x=p.x,y=-p.y;if(Math.abs(x-f.x)<760&&bullets.length<6){bullets.push({id,x,y,vx:p.vx??(old?(x-old.x)/Math.max(.008,time-old.at):0),vy:p.vy??(old?(y-old.y)/Math.max(.008,time-old.at):0)});projectile=true;}s.ballSamples[id]={x,y,at:time};}for(const id of Object.keys(s.ballSamples))if(time-s.ballSamples[id].at>.5)delete s.ballSamples[id];}
 let zone=false;if(e.frost)for(const z of e.frost.zones)if(z.life>0&&Math.abs(z.x-f.x)<window.CylastBase.CYLAST_SKILLS[z.k].range&&Math.abs(z.y-f.y)<180){zone=true;break;}
 const sample={at:time,readyAt:time+aiRand(...c.reaction),type:e.type,normalKey:e.type==='mox'&&e.mox.p.form?'moxRanged':e.type,form:e.mox?.p.form||0,n:a?.n||1,hp:e.hp,bullets,x:e.x,y:e.y,dir:e.dir,vx:e.vx,ground:e.ground,k:a?.k||null,age:a?.age||0,duration:a?.duration||0,fired:!!a?.fired,token,projectile,zone,approach:a?.k==='e'&&Math.abs(e.x-f.x)<Math.abs((s.sampleX??e.x)-f.x)-8,range:normalConfig(e).range};
 s.sampleX=e.x;s.observations.push(sample);if(s.observations.length>24)s.observations.shift();}
 while(s.observations.length&&s.observations[0].readyAt<=time){const v=s.observations.shift();s.seen=v;s.reaction=v.readyAt-v.at;
  if(v.token&&v.token!==s.lastAction){s.habits.total=s.habits.total*.95+1;s.habits.projectiles=Math.min(8,s.habits.projectiles*.95+(v.projectile?1:0));s.habits.approaches=Math.min(8,s.habits.approaches*.95+(v.approach?1:0));s.lastAction=v.token;}
  if(!v.k)s.lastAction=null;
  if(!v.ground&&s.lastGround)s.habits.jumps=Math.min(8,s.habits.jumps+1);s.lastGround=v.ground;
 }
}
function aiBusy(f){return !!(f.action||f.mox?.action||f.melanta?.a);}
function aiSet(s,state,reason,c){s.state=state;s.reason=reason;s.until=time+aiRand(...c.hold);s.stats.decisions++;}
function aiLegal(f,k,link=false){
 if(isStunned(f)||f.hp<=0||f.grabbedBy!=null)return false;
 if(k==='jump')return !aiBusy(f)&&f.rootUntil<=time&&(f.ground||f.jumps<2);
 if(!resourceReady(f,k))return false;
 if(!aiBusy(f))return k==='attack'?f.cd.attack<=1e-7&&legalCount(f,k,f.combo.active?Math.min(3,(f.combat.normalStep||0)+1):1):legalCount(f,k,0)||(f.type==='soul'&&k==='w'&&!!f.blade);
 if(!link)return false;
 if(k==='attack'&&f.normal)return f.normal.use.confirmed&&f.normal.n<3&&f.normal.age>=normalConfig(f).windows[f.normal.n-1][0]&&f.normal.age<=f.normal.duration&&legalCount(f,k,f.normal.n+1);
 return cancelReady(f,k)&&legalCount(f,k,k==='attack'?Math.min(3,(f.combat.normalStep||0)+1):0);
}
function aiTry(f,s,k,link=false){if(!aiLegal(f,k,link))return false;const prev=f.action,jumps=f.jumps,form=f.mox?.p.form;
 request(f,k);const accepted=k==='jump'?f.jumps!==jumps:k==='q'&&f.type==='mox'?f.mox.p.form!==form:!!f.action&&f.action!==prev;
 // Never leave failed tactical commands queued for later; the human buffer rules stay intact.
 if(!accepted){f.combat.buffer=null;s.stats.rejected++;return false;}
 s.chosen=k.toUpperCase();s.stats.accepted++;if(link)s.stats.links++;s.recent.push(k);if(s.recent.length>4)s.recent.shift();
 if(aiDebugEnabled){s.trace.push({at:time,k,state:s.state,reason:s.reason,link});if(s.trace.length>64)s.trace.shift();}return true;
}
function aiInRange(f,v,k,ranges){const dx=v.x-f.x,dy=Math.abs(v.y-f.y),d=Math.abs(dx),r=ranges[k]||0;
 if(k==='e'||k==='q'&&f.type==='mox')return true;
 if(k==='w'&&f.type==='soul')return f.blade?Math.hypot(v.x-f.blade.x,v.y-f.blade.y)<=normalConfig(f).range*1.2:d>=normalConfig(f).range*1.25&&d<=r&&dy<160;
 if(k==='r'&&f.type==='mox'&&!f.mox.p.form)return Math.hypot(dx,dy)<=r&&dy<90;
 return d<=r*.96&&dy<Math.min(normalConfig(f).height,k==='attack'?normalConfig(f).height:180);
}
function aiPick(f,s,v,link=false){const c=AI_CONFIG[difficulty]||AI_CONFIG.normal,style=aiStyle(f),ranges=aiRanges(f),choices=link?style.combo:Object.keys(style.open);let best=null,bestScore=-Infinity;
 for(const k of choices){if(!aiLegal(f,k,link)||!aiInRange(f,v,k,ranges))continue;
  if(link&&k!=='attack'&&specFor(f,k).role==='extend'&&f.combo.points<specFor(f,k).cost)continue;
  let weight=style.open[k]||1;const d=Math.abs(v.x-f.x),punish=v.k&&v.age>v.duration*.62;
  if(k==='r')weight*=punish||link?4:Math.abs(v.vx)<100?2.5:.8;
  if(k==='r'&&v.hp<400)weight*=2;
  if(link&&k==='attack'&&f.normal?.n===1)weight*=1.8;
  if(link&&k==='q'&&f.type==='soul')weight*=f.normal?.n>=2||!f.normal?8:2;
  if(link&&k==='r'&&f.type==='mox'&&f.normal?.n>=2)weight*=4;
  if(k==='w'&&f.type==='cylast')weight*=1.6;
  if(k==='r'&&f.type==='cylast'&&Math.abs(v.x-f.x)<ranges.r)weight*=1.7;
  if(v.type==='mox'&&v.k==='e'&&v.age+(time-v.at)<.5)weight*=.08;
  if(v.type==='soul'&&v.k==='e'&&v.age>.5&&k==='r')weight*=.2;
  if(k==='attack'&&d<ranges.attack*.85)weight*=1.3;
  if(k==='w'&&f.type==='cylast'&&Math.abs(v.vx)>200)weight*=.45;
  if(k==='q'&&f.type==='soul'&&!link)weight*=f.charges>1?1:.3;
  if(k==='w'&&f.type==='soul'&&!f.blade&&s.recent.at(-1)==='w')continue;
  if(difficulty==='hell'&&s.habits.jumps>=3&&!v.ground&&k==='attack')weight*=1.3;
  for(const prior of s.recent)if(prior===k)weight*=.82;
  const score=weight*aiRand(.78,1.22);if(score>bestScore){bestScore=score;best=k;}
 }return best;
}
function aiCombo(f,e,s,c){const use=f.normal?.use||f.action?.use||f.mox?.action?.use||f.combat.activeUse;
 if(!use?.confirmed||use.terminal||s.linked===use.id||!f.combo.active||actionLock(e)<=time||s.burst>=c.chain)return false;
 const v=s.seen;if(!v)return false;const k=aiPick(f,s,v,true);if(!k)return false;
 if(aiTry(f,s,k,true)){s.linked=use.id;s.burst++;s.wasBusy=true;s.state='attack';s.reason='Xác nhận trúng → nối hợp lệ';return true;}return false;
}
// Three-platform reachability graph, evaluated only when choosing a route on the ground.
// Physics estimates select a route; actual movement/jumps always use the normal game controller.
function aiNavigate(f,v,s,c){
 const jump=['cylast','mox'].includes(f.type)?660:900,g=['cylast','mox'].includes(f.type)?1800:1900,speed=f.type==='mox'?370:['cylast','melanta'].includes(f.type)?350:430,maxHeight=jump*jump/g-12;
 if(!f.ground&&f.jumps>0&&s.nav){f.move=s.move=(s.nav.aim-f.x)*s.nav.dir>6?s.nav.dir:0;
  if(f.jumps===1&&f.vy>-80&&aiLegal(f,'jump'))aiTry(f,s,'jump');
  s.state='approach';s.reason='Giữ quỹ đạo nhảy qua bệ';return true;}
 if(!f.ground&&f.jumps>0||v.y>=f.y-60)return false;
 const nodes=[{x:45,r:W-45,y:f.y},...platforms],start=platforms.findIndex(p=>Math.abs(p.y-f.y)<12&&f.x>=p.x-8&&f.x<=p.r+8)+1;
 const goal=platforms.findIndex(p=>Math.abs(p.y-v.y)<18&&v.x>=p.x-15&&v.x<=p.r+15)+1;
 if(!goal||start===goal)return false;
 const queue=[[start]],seen=new Set([start]);let path=null;
 while(queue.length){const route=queue.shift(),from=route.at(-1),a=nodes[from];if(from===goal){path=route;break;}
  for(let j=1;j<nodes.length;j++){if(seen.has(j))continue;const b=nodes[j],rise=a.y-b.y,gap=Math.max(0,b.x-a.r,a.x-b.r)+16,flight=2*jump/g+Math.sqrt(2*Math.max(0,maxHeight-rise)/g);
   if(rise>maxHeight||from&&gap>speed*flight*.98)continue;seen.add(j);queue.push([...route,j]);}
 }
 if(!path||path.length<2)return false;const next=nodes[path[1]],a=nodes[start],toward=Math.sign((next.x+next.r)/2-f.x)||1;
 // Launch from the near edge for a long crossing; from beneath an overhead platform otherwise.
 const launch=start?(toward>0?a.r-12:a.x+12):clamp(f.x,next.x+25,next.r-25);
 s.state='approach';s.reason='Chọn bệ trung gian có thể tới';s.until=time+.18;
 if(start&&Math.abs(f.x-launch)>8){s.navApproach={launch,dir:toward,aim:toward>0?next.x+12:next.r-12};s.move=Math.sign(launch-f.x);f.move=s.move;return true;}
 if(!start&&Math.abs(f.x-launch)>32){s.move=Math.sign(launch-f.x);f.move=s.move;return true;}
 s.nav={aim:start?(toward>0?next.x+12:next.r-12):clamp(f.x,next.x+25,next.r-25)};
 s.nav.dir=Math.sign(s.nav.aim-f.x);s.move=s.nav.dir;f.move=s.move;
 if(time>s.jumpAt&&aiLegal(f,'jump')){s.jumpAt=time+.9;aiTry(f,s,'jump');}return true;
}
// Assess threats from delayed visible observations, never from player commands.
// Projectile extrapolation uses only its measured velocity and the local fighter's motion.
function aiThreat(f,s,c){const v=s.seen;if(!v)return null;const lag=Math.min(.25,time-v.at);let closest=null;
 for(const p of v.bullets||[]){const rx=p.x+p.vx*lag-f.x,ry=p.y+p.vy*lag-(f.y-90),vx=p.vx-f.vx,vy=p.vy-f.vy,speed2=vx*vx+vy*vy;
  const arrival=speed2>1?-(rx*vx+ry*vy)/speed2:0;if(arrival<-.04||arrival>.65)continue;
  if(Math.abs(rx+vx*Math.max(0,arrival))>90||Math.abs(ry+vy*Math.max(0,arrival))>125)continue;
  if(!closest||arrival<closest.arrival)closest={id:p.id,kind:'projectile',arrival:Math.max(0,arrival),x:p.x+p.vx*lag};
 }
 if(closest)return closest;if(v.zone)return {id:'zone',kind:'zone',arrival:.25,x:v.x};
 if(v.type==='thunder'&&v.k==='q'&&v.age+lag<.5&&(f.x-v.x)*v.dir>0){const cast=Math.max(0,.5-v.age-lag),gap=(f.x+f.vx*cast-(v.x+v.dir*55))*v.dir,arrival=cast+Math.max(0,gap)/Math.max(100,740-f.vx*v.dir);if(gap>=0&&arrival<.85)return {id:'windup:'+v.token,kind:'projectile',arrival,x:v.x+v.dir*55};}
 if(!v.k)return null;if(v.type==='thunder'&&v.k==='q'||v.type==='mox'&&(v.k==='w'||v.form&&['attack','r'].includes(v.k))||v.type==='cylast'&&v.k==='attack')return null;const age=v.age+lag,d=Math.abs(v.x-f.x),dy=Math.abs(v.y-f.y),front=(f.x-v.x)*v.dir>-25;
 let reach=v.range,start=.12,active=.09;
 if(v.k==='attack'){const cfg=COMBAT_CONFIG.normals[v.normalKey];start=cfg?.startup[(v.n||1)-1]??.12;reach=cfg?.range??reach;}
 else if(v.type==='soul'){reach=v.k==='q'?COMBAT_CONFIG.specials.soul.q.range:v.k==='r'?COMBAT_CONFIG.specials.soul.r.range:reach;start=v.k==='r'?.65:v.k==='q'?.12:.5;active=v.k==='q'?.6:.2;}
 else if(v.type==='thunder'){reach=v.k==='w'?COMBAT_CONFIG.specials.thunder.w.range:v.range;start=v.k==='r'?.5:v.k==='w'?.6:.5;active=v.k==='r'?1.3:.2;}
 else if(v.type==='cylast'){reach=v.k==='q'?window.CylastBase.CYLAST_SKILLS.q.range:window.CylastBase.CYLAST_SKILLS[v.k]?.range||0;start=window.CylastBase.CYLAST_SKILLS[v.k]?.cast||.5;}
 else if(v.type==='mox'){reach=v.k==='r'?(v.form?window.MoxBase.MOX_R_RANGE.ranged:window.MoxBase.MOX_R_RANGE.melee):window.MoxBase.MOX_W_RANGE;start=v.k==='r'?(v.form?.15:.22):.18;active=v.k==='r'?1.3:.2;}
 else if(v.type==='melanta'){reach=v.k==='q'?window.MelantaLab.Q_REACH+window.MelantaLab.Q_RADIUS:window.MelantaLab.SKILLS[v.k]?.range||0;start=v.k==='q'?.72:v.k==='w'?.28:v.k==='r'?.3:.4;active=v.k==='r'?4:.2;}
 if((v.k==='e'||v.k==='q'&&v.type==='mox')||age>Math.min(v.duration,start+active)||d>reach+40||dy>230||!front&&v.k==='attack')return null;
 return {id:v.token,kind:'melee',arrival:Math.max(0,start-age),x:v.x};
}
function aiDefense(f,s,c,threat){if(!threat||time<s.evadeAt||threat.id===s.lastThreat&&threat.kind!=='projectile')return false;
 if(threat.kind==='projectile'&&threat.arrival>.42){s.move=0;f.move=0;s.state='space';s.reason='Canh nhịp cắt qua đường đạn';return true;}
 s.lastThreat=threat.id;s.evadeAt=time+c.evade;const adapt=difficulty==='hell'?Math.min(.025,s.habits.approaches*.005):0;
 if(Math.random()>Math.min(.97,c.defend+adapt))return false;
 const v=s.seen,toward=Math.sign(v.x-f.x)||f.dir,corner=f.x<100||f.x>W-100,away=threat.kind==='projectile'?toward:corner?(f.x<W/2?1:-1):-toward;
 aiSet(s,'defend',threat.kind==='projectile'?'Đọc đường đạn → né rồi phản công':'Né vùng nguy hiểm đã quan sát',c);s.move=away;f.move=away;f.dir=away;
 let k=null;
 if(f.type==='mox'&&aiLegal(f,'e'))k='e';
 else if(f.type==='thunder'&&aiLegal(f,'e')&&(threat.kind!=='projectile'||Math.abs(threat.x-f.x)<250))k='e';
 else if(f.type==='melanta'&&aiLegal(f,'e')&&threat.kind!=='projectile')k='e';
 else if(f.type==='soul'&&f.blade&&aiLegal(f,'w')&&Math.abs(f.blade.x-threat.x)>normalConfig(f).range*1.4)k='w';
 // Guard casts have startup: use them against a long warning, not as instant evasions.
 else if(['soul','cylast'].includes(f.type)&&threat.kind!=='projectile'&&threat.arrival>.42&&aiLegal(f,'e'))k='e';
 if(k&&aiTry(f,s,k)){s.wasBusy=true;s.stats.defenses++;return true;}
 if(aiLegal(f,'jump')&&time>=s.jumpAt){s.jumpAt=time+Math.max(.22,c.evade*.7);if(aiTry(f,s,'jump')&&threat.kind==='projectile')s.evadeJump={id:threat.id,againAt:time+.12};}
 // A short retreat, then counterattack; never wait out an arbitrary long defensive pause.
 s.until=time+(threat.kind==='projectile'?.22:Math.min(.18,c.hold[1]));s.stats.defenses++;return true;
}
function aiTactical(dt){const f=fighters[1];let e=fighters[0];if(e?.fairi?.stealth>0){if(f){f.move=0;if(f.pveAI)f.pveAI.seen=null}return}if(e?.fairi?.clones.length){const list=[e,...e.fairi.clones.map(c=>({...e,x:c.x,y:c.worldY??floor(c.x)-c.y,vx:c.vx,vy:-c.vy,action:null}))];const pick=f?.pveAI?.decoyChoice??(f?(f.pveAI??=aiState(f),f.pveAI.decoyChoice=Math.floor(Math.random()*list.length)):0);e=list[pick%list.length];}if(!f||!e)return;const c=AI_CONFIG[difficulty]||AI_CONFIG.normal,s=aiState(f);
 if(f.hp<=0||e.hp<=0){f.move=0;return;}
 aiObserve(f,e,s,c);
 if(isStunned(f)){f.move=0;f.combat.buffer=null;if(f.mox)f.mox.buffer=null;s.move=0;s.state='recover';s.reason='Đang mất quyền điều khiển';s.wasBusy=false;s.navApproach=null;s.nav=null;s.restUntil=Math.max(s.restUntil,time+.08);return;}
 if(s.evadeJump&&time>=s.evadeJump.againAt){if(f.jumps===1&&s.seen?.bullets?.some(p=>p.id===s.evadeJump.id)&&aiLegal(f,'jump'))aiTry(f,s,'jump');s.evadeJump=null;}
 if(aiCombo(f,e,s,c)){f.move=0;return;}
 if(aiBusy(f)){const v=s.seen,dx=v?v.x-f.x:0;f.move=f.normal&&v&&Math.abs(dx)>normalConfig(f).range*.82&&Math.sign(dx)===(f.normal.dir||f.dir)?Math.sign(dx):0;s.wasBusy=true;s.state='attack';s.reason='Cam kết startup / active / recovery';return;}
 if(s.wasBusy){s.wasBusy=false;s.burst=0;s.linked=null;s.restUntil=time+aiRand(...c.rest);aiSet(s,'recover','Hết chuỗi → để lộ sơ hở',c);s.move=0;}
 const v=s.seen;if(!v){f.move=0;s.state='observe';return;}
 if(s.navApproach&&f.rootUntil<=time&&time>s.jumpAt&&(s.navApproach.launch-f.x)*s.navApproach.dir<=8&&aiLegal(f,'jump')){s.nav={aim:s.navApproach.aim,dir:s.navApproach.dir};s.navApproach=null;s.jumpAt=time+.9;s.move=s.nav.dir;f.move=s.move;aiTry(f,s,'jump');return;}
 if(time<s.nextThink){f.move=s.move;return;}s.nextThink=time+c.think;
 const dx=v.x-f.x,d=Math.abs(dx),dy=v.y-f.y,toward=Math.sign(dx)||f.dir,style=aiStyle(f),ranges=aiRanges(f),sharedPlatform=platforms.find(p=>f.ground&&Math.abs(p.y-f.y)<12&&Math.abs(p.y-v.y)<18&&f.x>=p.x&&f.x<=p.r&&v.x>=p.x&&v.x<=p.r),preferred=Math.min(normalConfig(f).range*style.stand,sharedPlatform?(sharedPlatform.r-sharedPlatform.x)*.6:Infinity),near=Math.min(normalConfig(f).range*style.near,sharedPlatform?(sharedPlatform.r-sharedPlatform.x)*.18:Infinity);
 const corner=f.x<125||f.x>W-125,center=f.x<W/2?1:-1;
 if(aiDefense(f,s,c,aiThreat(f,s,c)))return;
 if(time<s.restUntil){s.state='recover';s.reason='Khoảng nghỉ sau chuỗi';s.move=0;f.move=0;return;}
 if(f.rootUntil>time){s.move=0;} // Root prohibits movement only; legal attacks remain available.
 if(time-s.stuckAt>.9){const stuck=Math.abs(f.x-s.stuckX)<18&&s.move!==0;s.stuckX=f.x;s.stuckAt=time;if(stuck&&f.rootUntil<=time){aiSet(s,'approach','Đổi đường khi tiếp cận thất bại',c);s.move=corner?center:toward;if(aiLegal(f,'jump')&&time>s.jumpAt){s.jumpAt=time+1.2;aiTry(f,s,'jump');}f.move=s.move;return;}}
 if(aiNavigate(f,v,s,c))return;if(f.ground)s.nav=null;
 if(Math.abs(dy)>120){aiSet(s,'approach','Tiếp cận đúng cao độ',c);s.move=d>90?toward:0;
  if(dy<0&&time>s.jumpAt&&aiLegal(f,'jump')){s.jumpAt=time+1.1;aiTry(f,s,'jump');}
  else if(dy>100&&f.ground&&f.y<floor(f.x)-25){f.drop=.25;f.y+=14;}
  f.move=s.move;return;
 }
 if(time<s.until&&['approach','space','retreat','defend','observe'].includes(s.state)){
  // Hysteresis terminates an approach before the bot walks through its opponent.
  if(s.state==='approach'&&(d<=preferred||d<=ranges.attack*.92&&Math.abs(dy)<normalConfig(f).height)||s.state==='retreat'&&d>=near*1.5){s.move=0;s.until=time;}else{f.move=s.move;return;}
 }
 if(corner&&d<near*1.4){aiSet(s,'defend','Tránh đứng kẹt trong góc',c);s.move=center;if(time>s.jumpAt&&aiLegal(f,'jump')){s.jumpAt=time+1.8;aiTry(f,s,'jump');}f.move=s.move;return;}
 if(f.type==='mox'&&time>s.nextForm&&f.cd.q<=0&&!f.combo.active){const ranged=!!f.mox.p.form,wantRanged=ranged?d>=normalConfig(f).range*.38:d>normalConfig(f).range*1.2||f.hp<350;
  if(ranged!==wantRanged){s.nextForm=time+aiRand(5,8);if(Math.random()<.72){aiSet(s,'space','Đổi dạng theo tầm giao tranh',c);f.dir=toward;s.move=0;f.move=0;if(aiTry(f,s,'q')){s.wasBusy=true;return;}}}}
 const opening=aiPick(f,s,v);
 if(d>preferred*1.18&&opening&&opening!=='r'&&Math.abs(dy)<120){s.move=0;f.move=0;f.dir=toward;aiSet(s,'attack','Bắt cơ hội trong tầm khi tiếp cận',c);if(aiTry(f,s,opening)){s.burst=1;s.wasBusy=true;return;}}
 if(d>preferred*1.18){aiSet(s,'approach','Vào tầm hiệu quả',c);s.move=toward;
  // Mobility is reserved for a real gap, with its own cooldown and full recovery.
  if(d>preferred*1.8&&d<preferred+normalConfig(f).range&&f.type!=='cylast'&&f.type!=='soul'&&aiLegal(f,'e')&&Math.random()<c.pressure*(difficulty==='hell'&&s.habits.projectiles>=3?.27:.18)){f.dir=toward;aiTry(f,s,'e');s.move=0;}
  f.move=s.move;return;}
 if(d<near&&!corner){aiSet(s,'retreat','Tạo lại khoảng đánh',c);s.move=-toward;f.move=s.move;return;}
 s.move=0;f.move=0;f.dir=toward;
 const punish=!!(v.k&&v.age>v.duration*.62);
 if(difficulty==='hell'&&time>s.feintAt&&!punish&&Math.random()<.035){s.feintAt=time+aiRand(3,5);aiSet(s,'space','Nhử đòn bằng bước ngắn',c);s.until=time+.18;s.move=d>preferred?-toward:toward;f.move=s.move;return;}
 if(Math.random()<c.miss||!punish&&Math.random()>c.pressure){aiSet(s,'observe','Đánh giá lại cơ hội',c);s.until=time+c.think;return;}
 const k=opening||aiPick(f,s,v);if(k){aiSet(s,'attack',punish?'Trừng phạt recovery đã quan sát':'Mở đợt tấn công trong tầm',c);if(aiTry(f,s,k)){s.burst=1;s.wasBusy=true;return;}}
 aiSet(s,'space','Giữ tầm, dành kỹ năng',c);

}
function ai(dt){aiTactical(dt);const f=fighters[1],s=f?.pveAI;if(!s)return;if(f.move&&s.lastMove&&f.move!==s.lastMove)s.stats.directionChanges++;if(f.move)s.lastMove=f.move;}
function aiDebugHUD(){const active=aiDebugEnabled&&mode==='pve'&&phase!=='menu';const el=$('aiDebug');if(!el)return;el.hidden=!active;if(!active||time<aiDebugClock)return;aiDebugClock=time+.1;const s=fighters[1]?.pveAI;if(!s)return;textIfChanged(el,`${names[fighters[1].type]} · ${difficulty.toUpperCase()}\n${s.state} · ${s.chosen}\n${s.reason}\nQuyết định: ${Math.max(0,s.nextThink-time,s.until-time,s.restUntil-time).toFixed(2)}s · Quan sát: ${Math.round((time-(s.seen?.at??time))*1000)}ms\nChuỗi: ${s.burst} · Nối trúng: ${s.stats.links}`);}
window.SagaAI={config:AI_CONFIG,styles:AI_STYLES,ranges:aiRanges,setDebug(value){aiDebugEnabled=!!value;aiDebugClock=0;const checkbox=$('aiDebugEnabled');if(checkbox)checkbox.checked=aiDebugEnabled;aiDebugHUD();},getState(){const s=fighters[1]?.pveAI;return s?JSON.parse(JSON.stringify(s)):null;}};
function beginFinisher(){combatSound('ko');phase='finishing';finishLeft=FINISH_CONFIG.duration;syncKOVisual();keys={};for(const f of fighters){f.move=0;if(f.fairi){window.FairiCombat.cancel(f,moxEnv(f));f.fairi.clones=[];f.fairi.stealth=0;f.fairi.wActive=false;}f.queue=[];f.combat.buffer=null;f.bleed=[];f.freezeBy=null;if(f.frost)f.frost.ice=null;f.jumpUntil=0;if(f.melanta){window.MelantaCombat.cancel(f,moxEnv(f));f.melanta.fx=[];}f.rootUntil=0;endCombo(f,'Kết liễu');}$('banner').hidden=true;}
function finishRound(){const [a,b]=fighters;if(a.hp===b.hp){showMessage('HIỆP HÒA','KHÔNG PHÂN THẮNG BẠI','Hiệp này sẽ được đấu lại.','ĐẤU LẠI HIỆP');phase='roundover';return;}const win=a.hp>b.hp?0:1;score[win]++;const match=score[win]>=2;phase=match?'matchover':'roundover';showMessage(match?'TRẬN ĐẤU KẾT THÚC':'KẾT THÚC HIỆP '+round,names[fighters[win].type]+' WINS',(win===0?'Người chơi 1':mode==='pve'?'Máy':'Người chơi 2')+' chiến thắng · '+score[0]+' : '+score[1],match?'CHƠI LẠI':'HIỆP TIẾP THEO');hud();combatSound('victory');}
// Pause descriptions match the live combat values and select the local online fighter.
const skillInfo={fairi:[{name:'Song dao N1–N2–N3',description:'Luân phiên hai dao găm; nối chiêu theo hit-confirm và ngân sách combo chung.',damage:'38 / hit',range:'125',cooldown:'0,36 / 0,38 / 0,48s'},{name:'Phi tiên',description:'3 tích lũy; lướt không bị ngắt bởi sát thương.',damage:'65',range:'340',cooldown:'Cách 0,8s · hồi từng lượt 2,5s'},{name:'Làn sương tiên lữ',description:'Mờ dần 0,5s, tàng hình 4s, miễn khống và tăng tốc 40%. Đánh trong tầm lao lên đâm; không tự choáng. Hồi chiêu bắt đầu khi hiện hình.',damage:'200',range:'650',cooldown:'6s sau hiện hình'},{name:'Ảo cảnh mơ màng',description:'4 bản sao, 500 HP mỗi bản sao, tồn tại 4s, không thanh máu. Giả chiêu không gây sát thương thật. Hồi chiêu khi bản sao cuối biến mất.',damage:'0',range:'Tỏa 1–3 / 3–1',cooldown:'9s sau kết thúc'},{name:'Ngũ kích tất sát',description:'Vận lực 0,5s, khóa và hội tụ theo hệ thống miễn khống của game. Bản sao biến mất trong sương rồi lao từ xa.',damage:'150 solo / 60 mỗi người',range:'650',cooldown:'12s'}],melanta:[{name:'Phi đà N1–N2–N3',description:'N1/N2 trúng mở cancel Q/W/E/R. Q trúng có thể nối đánh thường hoặc R; E trúng mở nối ở cuối chiêu. N3 kết thúc chuỗi, dây không gây thêm hit.',damage:'60 mỗi đòn',range:'300',cooldown:'0,48s'},{name:'Tử đằng giáng',description:'Miễn khống chế trong chiêu. Khóa điểm mục tiêu trong tầm 565 khi bắt đầu; dịch chuyển ra ngoài vùng nện để né. Nhảy tại chỗ, quật xuống ở 0,72s; choáng 1s theo ngân sách khống chế.',damage:'100',range:'Trước 375 · bán kính 190',cooldown:'3s'},{name:'Phi đà trói buộc',description:'Kháng giật từ sát thương trong chiêu. Bắt phía trước, trói chân đến khi áp sát; W → R sau hit áp sát.',damage:'80',range:'700',cooldown:'6s'},{name:'Ảnh vũ',description:'Kháng giật từ sát thương. Lộn tiến 400; tăng tốc 35% trong 2s, giữ đà dọc khi trên không.',damage:'50',range:'400',cooldown:'3s'},{name:'Vũ điệu gai tím',description:'Miễn khống chế tới khi hết chiêu. Nện xuống nếu trên không, múa 4s; 13 hit cách 0,3s, có bộ đếm hit riêng. Chỉ nối true combo khi đối thủ chưa thể phản công. Giảm sát thương nhận 20%; mỗi hit gây sát thương hồi 10 HP.',damage:'65 × 13',range:'Bán kính 500',cooldown:'14s'}],
 mox:[
 {name:'Hỏa quyền / Hỏa đạn',description:'N1 → N2 → N3: đấm trái–phải hoặc phóng đạn theo dạng. N1/N2 trúng có thể nối W; dạng cận chiến có thể cancel sang R. N3 đẩy văng. Đạn bay xa có thể tạo khe hở; đổi dạng không đặt lại combo.',damage:'75 / 75 / 97,5 gần · 60 / 60 / 78 xa',range:'Tầm 300 / 700',cooldown:'Theo nhịp N1 / N2 / N3'},
 {name:'Chuyển dạng',description:'Đổi giữa cận chiến và đánh xa, miễn khống chế 1s. Vẫn nhận sát thương; không dùng để giải choáng đã có.',damage:'Miễn khống chế 1s',range:'Bản thân',cooldown:'2s'},
 {name:'Song hỏa cầu',description:'Sau 0,18s phóng hai cầu theo hai đường cong chéo, khóa vị trí đối thủ lúc phóng. Trúng sẽ đẩy lùi và thiêu đốt 50 máu/giây trong 3s; hit mới làm mới thời gian, không cộng tầng.',damage:'100 × 2 + tối đa 150 thiêu đốt',range:'Tầm 500',cooldown:'5s'},
 {name:'Lướt ảnh',description:'Lướt theo hướng đang nhìn trong 0,5s, miễn sát thương và khống chế từ đòn trúng trong thời gian này.',damage:'Miễn sát thương 0,5s',range:'Lướt tối đa khoảng 500',cooldown:'4s'},
 {name:'Thiên giáng / Tứ hỏa truy kích',description:'Cận chiến: lao tới bắt, bay lên, lộn ngược rồi nện đối thủ; choáng 1s sau impact. Đánh xa: khóa mục tiêu trong 450, phóng 4 cầu bám địch cách nhau 0,22s. Hai dạng dùng chung hồi chiêu.',damage:'400 gần / 87,5 × 4 = 350 xa',range:'Tầm bắt 300 / khóa xa 450',cooldown:'15s'}
 ],
 cylast:[
 {name:'Băng tiễn',description:'N1 → N2 → N3 bắn từ đầu trượng. N1/N2 xác nhận trúng có thể nối Q/W/R; startup và đạn bay vẫn có thể tạo khe hở. Đạn không tự đuổi; N3 đẩy văng.',damage:'65 / 65 / 84,5',range:'Tầm 1000',cooldown:'0,38s'},
 {name:'Quang băng',description:'Vận 0,65s. Đối thủ phải trong tầm khi bắt đầu và kết thúc. Trúng chiêu đóng băng 1s. Đòn thường đầu tiên của chính Cylast phá băng, gây 110% sát thương gốc của đòn đó trước scaling; không thêm hit hoặc stun từ mảnh vỡ.',damage:'150',range:'Tầm 600',cooldown:'4,3s sau vận chiêu'},
 {name:'Mưa băng',description:'Vận 0,2s rồi tạo vùng mưa băng cố định trong 4s. Gây sát thương mỗi giây; không cộng dồn vùng.',damage:'30 × 4',range:'Bán kính 200 · đặt trong 1000',cooldown:'3,5s sau khi vùng hết'},
 {name:'Sương hộ mệnh',description:'Vận 0,5s tạo khiên hấp thụ 300 sát thương trong 1,2s. Sát thương vượt khiên trừ vào máu.',damage:'Khiên 300',range:'Bảo vệ bản thân',cooldown:'6s khi tạo khiên'},
 {name:'Bão tuyết',description:'Vận 0,5s tại vị trí bắt đầu. Bão tồn tại 3s, gây sát thương mỗi giây và hồi tối đa 20 máu mỗi giây khi gây sát thương thực tế. Không trói chân đối thủ.',damage:'300 → 240 → 180 · hồi tối đa 20 / giây',range:'Bán kính 400',cooldown:'15s'}
 ],
 thunder:[
  {name:'Lôi kích',description:'N1 → N2 → N3, tầm 600. N1/N2 trúng có thể nối Q/W/E; Q/W vẫn cần startup. E đổi vị trí, không tạo hitstun hay tăng COMBO. N3 kết thúc.',damage:'28 / 28 / 36,4',range:'Tầm 600',cooldown:'Theo nhịp N1 / N2 / N3'},
  {name:'Lôi đạn',description:'Vận chiêu 0,5s rồi bắn cầu sét về phía trước.',damage:'90',range:'Đạn bay thẳng',cooldown:'2,4s'},
  {name:'Thiên lôi chấn',description:'Nhảy lên rồi dậm xuống. Khi chạm đất gây sát thương lan, đẩy đối thủ ra xa khoảng 100 và choáng 0,2s.',damage:'115',range:'Bán kính 360',cooldown:'4,5s'},
  {name:'Lôi ảnh bộ',description:'Dịch chuyển tức thời và gây sát thương trên đường lướt. Vệt sét tồn tại 0,5s.',damage:'22',range:'Lướt 310',cooldown:'3,2s'},
  {name:'Thiên phạt',description:'Vận 0,5s rồi giật 3 lần tại điểm đã chọn, mỗi lần gây 100 sát thương. Mỗi lần trúng gây choáng 1,5s; lần sau làm mới thời gian, không cộng dồn.',damage:'100 × 3',range:'Ba lần đánh',cooldown:'9s'}
 ],
 soul:[
  {name:'Huyết trảm',description:'N1 → N2 → N3. Chỉ nối khi trúng. N1/N2 có thể hủy recovery sang Q; Q có thể nối đòn thường hoặc Q còn charge. N3 đẩy văng và kết thúc.',damage:'65 / 65 / 84,5',range:'Tầm 200',cooldown:'Theo nhịp N1 / N2 / N3'},
  {name:'Vũ điệu lưỡi kiếm',description:'Xoay kiếm 4 nhịp, tổng sát thương gốc 95. Có 2 lượt hồi độc lập sau 5s. Chỉ mở cancel sau nhịp cuối; mỗi lượt chỉ tốn 1 điểm mở rộng.',damage:'23,75 × 4 = 95',range:'Bán kính 400',cooldown:'5s / lượt'},
  {name:'Ảnh kiếm',description:'Nhảy và phi kiếm cách 600. Kiếm cắm đất tồn tại 3s; bấm W lần nữa để dịch chuyển tới kiếm và chém quanh điểm đáp. Hồi chiêu sau tái kích hoạt hoặc hết hạn.',damage:'120 khi dịch chuyển',range:'Ném 600 · bán kính 260',cooldown:'4s'},
  {name:'Hồn nhập kiếm',description:'Vận 0,5s rồi hóa kiếm trong 2s, giảm 80% sát thương nhận vào. Bắt đầu hồi chiêu khi kết thúc.',damage:'Giảm 80% sát thương',range:'Tự bảo vệ',cooldown:'8s'},
  {name:'Huyết nguyệt',description:'Nhảy rồi dập đất. Chỉ gây nổ khi chạm đất; đối thủ trúng đòn bị xuất huyết, nổ sau 3s. Trong thời gian này, Mỗi hit trực tiếp của Soulblade gây sát thương thêm 1 tầng: +3% sát thương nổ cơ bản, tối đa 10 tầng (+30%). Không làm mới 3s; DOT và vụ nổ không cộng tầng.',damage:'240 + 60 × (1 + 0,03 × tầng), trước scaling',range:'Bán kính 520',cooldown:'12s'}
 ]
};
function renderPauseSkills(id=localId()){
 const visible=phase==='paused';$('pauseSkills').hidden=!visible;if(!visible)return;
 if(mode!=='pvp')id=localId();const f=fighters[id];if(!f)return;
 $('pauseSkills').style.color=colors[f.type];$('pauseCharacter').textContent=names[f.type]+(mode==='pvp'?' · P'+(id+1):'');
 $('pauseTabs').hidden=mode!=='pvp';
 for(const b of document.querySelectorAll('[data-pause-fighter]')){b.classList.toggle('selected',+b.dataset.pauseFighter===id);b.textContent='P'+(+b.dataset.pauseFighter+1)+' · '+names[fighters[+b.dataset.pauseFighter].type];}
 const keyboard=mode==='pvp'&&id===1?['Enter','1','2','3','4']:['Space','Q','W','E','R'];
 const html=skillInfo[f.type].map((base,i)=>{const protectedCast={thunder:['e','r'],soul:['r'],cylast:['w','r'],mox:['r']}[f.type]?.includes(moves[i]);const info=protectedCast?{...base,description:base.description+' Không bị giật/ngắt bởi sát thương thường trong lúc thi triển; vẫn chịu sát thương và khống chế riêng.'}:base;
  const k=moves[i];let status=f.cd[k]>0?'Còn '+f.cd[k].toFixed(1)+'s':'Sẵn sàng';
  if(k==='q'&&f.type==='soul')status=f.charges+'/2 lượt'+(f.qRecharge.length?' · +1 sau '+Math.min(...f.qRecharge).toFixed(1)+'s':'');
  if(k==='w'&&f.blade)status=f.blade.age<.3?'Kiếm đang bay':'Có thể tái kích hoạt';
  if(k==='e'&&f.type==='soul'&&f.action?.k==='e')status=f.action.age<.5?'Đang vận chiêu':'Đang hóa kiếm';
  if(f.type==='cylast'&&k==='w'&&f.frost.zones.some(z=>z.k==='w'))status='Vùng mưa đang hoạt động';if(f.type==='cylast'&&k==='e'&&f.shield>0)status='Khiên '+f.shield+' · '+Math.max(0,f.shieldUntil-time).toFixed(1)+'s';
  if(f.mox&&k==='q')status=(f.mox.p.form?'Đánh xa':'Cận chiến')+' · '+status;
  return `<article class="pause-skill"><div class="pause-skill-top"><span class="pause-key">${i===0?'ĐÁNH':k.toUpperCase()}</span><h4>${info.name}</h4><kbd>${keyboard[i]}</kbd></div><p>${info.description.replace('bấm W','bấm '+keyboard[i])}</p><div class="pause-stats"><span>${(k==='e'||k==='q')&&f.type==='mox'||k==='e'&&(f.type==='soul'||f.type==='cylast')?'':'Sát thương '}${info.damage}</span><span>${info.range}</span><span>Hồi ${info.cooldown}</span></div><small class="pause-skill-status">${status}</small></article>`;
 }).join('');
 if($('pauseSkillList').innerHTML!==html)$('pauseSkillList').innerHTML=html;
}
for(const button of document.querySelectorAll('[data-pause-fighter]'))button.onclick=()=>renderPauseSkills(+button.dataset.pauseFighter);
function showMessage(sub,title,detail,button){rollbackMessage={sub,title,detail,button};if(rollbackDriving)return;$('pauseSettings').hidden=phase!=='paused';document.body.classList.toggle('paused',phase==='paused');$('back').textContent=phase==='paused'?'VỀ TRANG CHỦ':'CHỌN LẠI';$('message').hidden=false;$('messageSub').textContent=sub;$('messageTitle').textContent=title;$('messageDetail').textContent=detail;$('continue').textContent=button;renderPauseSkills();}
function pause(){if(onlineActive()&&window.riftNet.fullRollback&&!rollbackDriving){window.riftNet.action('pause');return;}if(onlineGuest()){window.riftNet.action('pause');return;}if(phase==='fight'||phase==='countdown'||phase==='finishing'){pausedFrom=phase;phase='paused';if(!rollbackDriving)window.sagaAudio?.stopCombat();keys={};for(const f of fighters)f.combat.buffer=null;showMessage('SAGA FIGHT','TẠM DỪNG','Trận đấu sẽ tiếp tục từ vị trí hiện tại.','TIẾP TỤC');}else if(phase==='paused'){$('message').hidden=true;document.body.classList.remove('paused');phase=pausedFrom;focusGame();}}
function step(dt){simTick++;if(!rollbackDriving)window.riftNet?.beforeStep?.();const finishing=phase==='finishing';if(finishing){finishLeft=Math.max(0,finishLeft-dt);dt*=FINISH_CONFIG.speed;}time+=dt;effects.forEach(e=>e.age+=dt);effects=effects.filter(e=>e.age<e.life);shake*=Math.exp(-dt*14);moxShake*=Math.exp(-dt*8);if(phase==='countdown'){countdown=Math.max(0,countdown-dt);if(countdown<=.65+1e-8){combatSound('round_start');phase='fight';}updateCountdownBanner();return;}if(finishing&&melantaKiller!=null){if(finishLeft<=0)finishRound();return;}if(finishing){for(const f of fighters)updateFighter(f,dt);for(const s of shots){s.age+=dt;s.x+=s.vx*dt;s.y+=(s.vy||0)*dt;}shots=shots.filter(s=>s.age<2.6&&s.x>0&&s.x<W);if(finishLeft<=0)finishRound();return;}if(phase!=='fight')return;if(countdown>0){countdown=Math.max(0,countdown-dt);updateCountdownBanner();}reconcileCombos();dummyDefense();
if(mode!=='sandbox')remaining=Math.max(0,remaining-dt);if(rollbackInputs){fighters[0].move=rollbackInputs[0].m;fighters[1].move=rollbackInputs[1].m;}else{fighters[0].move=(keys.KeyD||((mode==='pve'||mode==='online'||mode==='sandbox')&&keys.ArrowRight)?1:0)-(keys.KeyA||((mode==='pve'||mode==='online'||mode==='sandbox')&&keys.ArrowLeft)?1:0);if(mode==='online')fighters[1].move=remoteMove;else if(mode==='pvp')fighters[1].move=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);else if(mode!=='sandbox'||sandboxOptions.ai)ai(dt);else fighters[1].move=0;}for(const f of fighters){if(mode==='sandbox'&&sandboxOptions.free)resetCooldowns(f);updateFighter(f,dt);if(mode==='sandbox'){if(sandboxOptions.free)resetCooldowns(f);if(time-f.lastHurt>1.8)f.hp=f.fairi?900:1000;}}
for(const s of shots){const prev=s.x;s.age+=dt;s.x+=s.vx*dt;s.y+=(s.vy||0)*dt;if(s.kind==='frost')s.remaining-=Math.hypot(s.vx,s.vy)*dt;const e=fighters[1-s.owner];if(decoyProjectile(fighters[s.owner],prev,s.y,s.x,s.y,s.damage??90,s.hitId||'shot:'+s.owner+':'+Math.round((time-s.age)*1000)))s.age=5;if(s.age<2.6&&(s.kind==='frost'?e.x>=Math.min(prev,s.x)-24&&e.x<=Math.max(prev,s.x)+24:Math.abs(e.x-s.x)<42)&&s.y>e.y-205&&s.y<e.y+10){damage(fighters[s.owner],e,s.damage??(s.kind==='frost'?65:90),s.kind==='frost'?0:60,false,false,{use:s.use,hitId:s.hitId,last:true});emit(s.kind==='frost'?'frostBurst':'spark',s.x,s.y,s.kind==='frost'?colors.cylast:colors.thunder,130,{life:.4});s.age=5;}}shots=shots.filter(s=>s.age<2.6&&s.x>0&&s.x<W&&(s.kind!=='frost'||s.remaining>0));
reconcileCombos();if(mode!=='sandbox'){if(fighters.some(f=>f.hp<=0))beginFinisher();else if(remaining<=0)finishRound();}}
function hud(){if(rollbackDriving)return;if(!fighters.length)return;for(const f of fighters){if(f.mox)textIfChanged($('n'+f.id),'MOX · '+(f.mox.p.form?'ĐÁNH XA':'CẬN CHIẾN'));const max=f.fairi?900:1000,width=f.hp/max*100+'%';if($('hp'+f.id).style.width!==width)$('hp'+f.id).style.width=width;textIfChanged($('num'+f.id),Math.ceil(f.hp)+' / '+max);textIfChanged($('wins'+f.id),[0,1].map(i=>(window.riftNet?.fullRollback&&rollbackCommitted?rollbackCommitted.score:score)[f.id]>i?'●':'○').join(' '));const buttons=$('skills'+f.id).children;for(let i=0;i<buttons.length;i++){const k=moves[i],left=f.cd[k],charge=k==='q'&&(f.type==='soul'||f.fairi),warp=k==='w'&&f.blade;const chainReady=k==='attack'&&f.normal?.use.confirmed&&f.normal.n<3&&f.normal.age>=normalConfig(f).windows[f.normal.n-1][0];buttons[i].classList.toggle('cancel-ready',cancelReady(f,k)||chainReady);textIfChanged(buttons[i].querySelector('span'),f.fairi&&((k==='w'&&f.fairi.wActive)||(k==='e'&&f.fairi.eActive))?'ACTIVE':chainReady?'NỐI N'+(f.normal.n+1):f.frost&&k==='w'&&f.frost.zones.some(z=>z.k==='w')?'ACTIVE':warp?'RECAST':charge&&left>0?left.toFixed(1)+'s':charge?f.charges+'/'+(f.fairi?3:2)+(f.qRecharge.length?' · '+Math.min(...f.qRecharge).toFixed(1):''):left>0?left.toFixed(1)+'s':'READY');buttons[i].classList.toggle('cooling',!chainReady&&(charge?!f.charges||left>0:left>0));buttons[i].classList.toggle('active',f.action?.k===k||!!warp);}}textIfChanged($('timer'),mode==='sandbox'?'∞':Math.ceil(remaining).toString().padStart(2,'0'));textIfChanged($('round'),mode==='sandbox'?'LUYỆN TẬP':'HIỆP '+String(round).padStart(2,'0'));sandboxHUD();aiDebugHUD();}
function line(points,color,width=2,glow=10){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(...points[i]):ctx.moveTo(...points[i]);ctx.stroke();ctx.restore();}
// Bounded integer-phase raster cache. Smooth temporal blend keeps endpoints anchored.
const boltSprites=new Map();let boltPixels=0;
function bolt(x,y,tx,ty,color,width=3,seed=0){const phase=Math.max(0,seed),a=Math.floor(phase),u=phase-a,t=u*u*(3-2*u),alpha=ctx.globalAlpha;
 width*=1.5;if(t>0)ctx.globalAlpha=alpha*(1-t);boltFrame(x,y,tx,ty,color,width,a);if(t>0){ctx.globalAlpha=alpha*t;boltFrame(x,y,tx,ty,color,width,a+1);}ctx.globalAlpha=alpha;}
function boltFrame(x,y,tx,ty,color,width,seed){const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy),transform=ctx.getTransform?.(),scale=transform?Math.hypot(transform.a,transform.b):1;const key=[dx.toFixed(2),dy.toFixed(2),color,width,seed,scale.toFixed(3)].join(':');let sprite=boltSprites.get(key);
if(sprite){boltSprites.delete(key);boltSprites.set(key,sprite);ctx.drawImage(sprite.image,x+sprite.x,y+sprite.y,sprite.w,sprite.h);return;}
const n=Math.max(5,Math.ceil(len/30)),points=[];for(let i=0;i<=n;i++){const o=i===0||i===n?0:Math.sin(i*12.4+seed*7)*16;points.push([dx*i/n-dy/(len||1)*o,dy*i/n+dx/(len||1)*o]);}
const padding=42,minX=Math.min(...points.map(p=>p[0]))-padding,minY=Math.min(...points.map(p=>p[1]))-padding,maxX=Math.max(...points.map(p=>p[0]))+padding,maxY=Math.max(...points.map(p=>p[1]))+padding;
const image=document.createElement('canvas');image.width=Math.max(1,Math.ceil((maxX-minX)*scale));image.height=Math.max(1,Math.ceil((maxY-minY)*scale));const pixels=image.width*image.height;
if(pixels>1000000){line(points.map(p=>[p[0]+x,p[1]+y]),color,width,12);line(points.map(p=>[p[0]+x,p[1]+y]),'#fff6df',Math.max(1,width*.3),0);return;}
const g=image.getContext('2d');g.setTransform(scale,0,0,scale,-minX*scale,-minY*scale);g.lineJoin='round';g.lineCap='round';g.beginPath();for(let i=0;i<points.length;i++)i?g.lineTo(...points[i]):g.moveTo(...points[i]);g.strokeStyle=color;g.lineWidth=width;g.shadowColor=color;g.shadowBlur=12;g.stroke();g.strokeStyle='#fff6df';g.lineWidth=Math.max(1,width*.3);g.shadowBlur=0;g.stroke();
while(boltSprites.size&&(boltPixels+pixels>4000000||boltSprites.size>=96)){const oldest=boltSprites.keys().next().value;boltPixels-=boltSprites.get(oldest).pixels;boltSprites.delete(oldest);}
sprite={image,x:minX,y:minY,w:image.width/scale,h:image.height/scale,pixels};boltSprites.set(key,sprite);boltPixels+=pixels;ctx.drawImage(image,x+minX,y+minY,sprite.w,sprite.h);}
// Reference poses keep individual proportions; the body hovers and the orb sits ABOVE the outstretched hand.
function thunderDraw(f,drawContext=ctx){const ctx=drawContext;
 const a=f.action,k=a?.k,age=a?.age||0;
 let pose='idle',height=220;
 if(k==='attack'){pose=age<(a.startup??.1)?'charge':'shoot';height=age<(a.startup??.1)?188:207;}
 if(k==='q'){pose=age<.5?'charge':'shoot';height=age<.5?206:214;}
 if(k==='w'){pose=a.diving?'slam':'lift';height=a.diving?159:229;}
 if(k==='e'){pose=age<.08?'dash':'appear';height=223;}
 if(k==='r'){pose=age<.5?'charge':'ultimate';height=age<.5?208:173;}
 const poseKey=pose+':'+height;
 f.poseLayers??=[{pose:'idle',height:220,alpha:1}];
 if(f.poseKey!==poseKey){f.poseKey=poseKey;for(const l of f.poseLayers)l.active=false;f.poseLayers.push({pose,height,alpha:0,active:true});}
 const dt=clamp(time-(f.poseClock??time),0,.05);f.poseClock=time;
 for(const l of f.poseLayers)l.alpha+=((l.active?1:0)-l.alpha)*(1-Math.exp(-dt*22));
 f.poseLayers=f.poseLayers.filter(l=>l.active||l.alpha>.012);
 const weight=f.poseLayers.reduce((sum,l)=>sum+l.alpha,0)||1;
 const bob=Math.sin(time*2.8)*3,foot=-12+bob;
 ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.dir,1);ctx.translate(0,-165);ctx.rotate(f.lean*.55);ctx.translate(0,165);
 for(const l of f.poseLayers){const img=art[l.pose];if(!img?.complete||!img.naturalWidth)continue;
  const h=l.height,w=h*img.naturalWidth/img.naturalHeight,top=foot-h,seam=.42;
  ctx.save();ctx.globalAlpha=l.alpha/weight;
  ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight*seam+1,-w/2,top,w,h*seam+.5);
  ctx.translate(0,top+h*seam);ctx.transform(1,0,(f.cloth*.38+Math.sin(time*2.5)*1.2)/(h*(1-seam)),1,0,0);
  ctx.drawImage(img,0,img.naturalHeight*seam,img.naturalWidth,img.naturalHeight*(1-seam),-w/2,0,w,h*(1-seam)+.5);ctx.restore();
 }
 let ox=57,oy=foot-185;
 if(k==='q'){ox=age<.5?0:78;oy=age<.5?foot-110:foot-139;}
 if(k==='attack'){ox=age<.1?0:78;oy=foot-140;}
 if(k==='w'){ox=0;oy=foot-(a.diving?55:245);}
 if(k==='r'){ox=0;oy=foot-(age<.5?110:235);}
 const glow=ctx.createRadialGradient(ox,oy,2,ox,oy,27);glow.addColorStop(0,'#fffbc7bb');glow.addColorStop(.4,'#fff36c55');glow.addColorStop(1,'#fff36c00');ctx.fillStyle=glow;ctx.fillRect(ox-27,oy-27,54,54);
 ctx.fillStyle='#fffdaf';ctx.shadowColor='#fff35e';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(ox,oy,7.5,0,7);ctx.fill();ctx.shadowBlur=0;
 for(let j=0;j<3;j++){const points=[];for(let i=0;i<9;i++){const theta=time*(j===1?-4:5)+j*2.1+i*.25,r=10+Math.sin(i*3+time*9)*2;points.push([ox+Math.cos(theta)*r,oy+Math.sin(theta)*r]);}line(points,'#fffb9a',1.3,3);}
 ctx.restore();
 if(a&&['q','r'].includes(k)&&age<.5)for(let i=0;i<3;i++){const theta=time*9+i*2.1;bolt(f.x+Math.cos(theta)*65,f.y-125+Math.sin(theta)*60,f.x+25,f.y-120,colors.thunder,1.3,i);}
}
function drawBlade(f){const b=f.blade;if(!b)return;const k=clamp(b.age/.3,0,1),x=b.from+(b.x-b.from)*k,y=b.fromY+(b.y-b.fromY)*k;const ang=Math.atan2(b.y-b.fromY,b.x-b.from);ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.shadowColor=colors.soul;ctx.shadowBlur=12;ctx.fillStyle=colors.soul;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-32,-25,-90,-15);ctx.quadraticCurveTo(-50,-7,-20,8);ctx.closePath();ctx.fill();ctx.restore();if(k<1)line([[x-Math.cos(ang)*85,y-Math.sin(ang)*85],[x,y]],colors.soul,3);else{ctx.textAlign='center';ctx.font='12px Arial';ctx.fillStyle=colors.soul;ctx.fillText('W · DỊCH CHUYỂN',b.x,b.y+30);}}
// Two small cached textures; no live blur, filters, or particle spawning per frame.
const statusTextures=new Map();
function statusMist(color){let texture=statusTextures.get(color);if(texture)return texture;texture=document.createElement('canvas');texture.width=192;texture.height=256;const g=texture.getContext('2d');for(let i=0;i<9;i++){const x=96+Math.sin(i*2.4)*49,y=128+Math.cos(i*2.4)*72,r=36+(i%3)*12,gradient=g.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color+'80');gradient.addColorStop(.45,color+'38');gradient.addColorStop(1,color+'00');g.fillStyle=gradient;g.fillRect(x-r,y-r,r*2,r*2);}statusTextures.set(color,texture);return texture;}
function drawBleedFog(f,front){if(!f.bleed.length||f.hp<=0)return;let stacks=0,left=3;for(const mark of f.bleed){stacks=Math.max(stacks,mark.stacks||0);left=Math.min(left,mark.until-time);}const contract=1-.1*clamp(1-left/.18,0,1),sway=Math.sin(time*1.7+f.id)*4;ctx.save();ctx.translate(f.x+sway,f.y-110);ctx.scale(contract*(1+.025*Math.sin(time*1.3)),contract);ctx.globalAlpha=front?.10+stacks*.009:.34+stacks*.025;ctx.drawImage(statusMist('#b51f45'),-91,-132,182,264);ctx.restore();if(front){ctx.save();ctx.fillStyle='#db7d91';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText('XUẤT HUYẾT '+stacks+'/10',f.x,f.y-265);ctx.restore();}}
const iceFragments=Array.from({length:10},(_,i)=>({angle:i*2.39996,r:18+(i%3)*9,size:6+(i%4)*3}));
function drawStatusEffect(e){const u=clamp(e.age/e.life,0,1),fade=(1-u)*(1-u);ctx.save();ctx.translate(e.x,e.y);ctx.shadowBlur=0;
 if(e.type==='bleedBurst'){const expand=1-Math.pow(1-u,3),size=100+expand*105;ctx.globalAlpha=fade*.65;ctx.drawImage(statusMist('#b51f45'),-size,-size*.95,size*2,size*1.9);ctx.globalAlpha=fade*.48;ctx.strokeStyle='#c24a64';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,45+expand*92,58+expand*76,.1,0,Math.PI*2);ctx.stroke();}
 else {if(u<.22){ctx.globalAlpha=(1-u/.22)*.6;ctx.strokeStyle='#badfea';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-43,82);ctx.lineTo(-61,-47);ctx.lineTo(-27,-100);ctx.lineTo(33,-92);ctx.lineTo(59,-32);ctx.lineTo(40,97);ctx.closePath();ctx.moveTo(-27,-100);ctx.lineTo(8,-35);ctx.lineTo(-23,-8);ctx.lineTo(15,28);ctx.lineTo(-9,95);ctx.stroke();}for(const shard of iceFragments){const radius=shard.r+u*85;ctx.save();ctx.translate(Math.cos(shard.angle)*radius,Math.sin(shard.angle)*radius+u*u*70);ctx.rotate(shard.angle+u*1.5);ctx.globalAlpha=fade*.75;ctx.fillStyle='#9bcfdf';ctx.strokeStyle='#c8eaf2';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-shard.size,shard.size*.65);ctx.lineTo(0,-shard.size*1.4);ctx.lineTo(shard.size*.55,shard.size*.6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}ctx.globalAlpha=fade*.32;ctx.drawImage(statusMist('#80bfd2'),-105-u*30,-120,210+u*60,240);}
 ctx.restore();
}

function drawArenaEffect(e){if(e.type.startsWith('frost')&&e.type!=='frostLink')window.CylastVisual.effect(ctx,e);else drawEffect(e);}
function drawEffect(e){if(e.type==='frostLink'){const fade=1-clamp((e.age/e.life-.4)/.6,0,1);ctx.save();ctx.lineCap='round';ctx.strokeStyle='#75d9ff';ctx.globalAlpha=fade*.3;ctx.lineWidth=32;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.toX,e.toY);ctx.stroke();ctx.globalAlpha=fade*.9;ctx.lineWidth=16;ctx.stroke();ctx.strokeStyle='#ecfbff';ctx.globalAlpha=fade;ctx.lineWidth=6;ctx.stroke();ctx.restore();return;}if(e.type==='bleedBurst'||e.type==='iceBreak'){drawStatusEffect(e);return;}const z=e.age/e.life;ctx.save();ctx.globalAlpha=1-z;const c=e.color;if(e.type==='soulSlam'){window.drawSoulSlam(ctx,e);}if(e.type==='bolt'){bolt(e.x,e.y,e.toX,e.toY,c,e.width||3,e.age*18);}if(e.type==='damage'){ctx.fillStyle=c;ctx.font='bold 25px Arial';ctx.textAlign='center';ctx.fillText(e.text,e.x,e.y-z*65);}if(e.type==='spark'||e.type==='dust'){for(let i=0;i<12;i++){const angle=i*2.4,dist=e.size*z*(.4+(i%3)*.22);ctx.fillStyle=c;ctx.fillRect(e.x+Math.cos(angle)*dist,e.y+Math.sin(angle)*dist-z*20,3+(i%3),3+(i%3));}}if(e.type==='ring'){ctx.strokeStyle=c;ctx.shadowColor=c;ctx.shadowBlur=14;ctx.lineWidth=9*(1-z);ctx.beginPath();ctx.ellipse(e.x,e.y,e.size*(.3+.7*z),e.size*.24*(.3+.7*z),-.2,0,7);ctx.stroke();}if(e.type==='slam'){ctx.translate(e.x,e.y);const expand=1-Math.pow(1-clamp(z*4,0,1),3);ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(-e.size*expand,0);for(let i=0;i<17;i++){const x=(-1+i/8)*e.size*expand,y=-(i%2?40:80+(Math.sin(i*9)+1)*65)*Math.sin(Math.PI*(i+1)/18)*expand;ctx.lineTo(x,y);}ctx.lineTo(e.size*expand,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=c;ctx.lineWidth=5*(1-z);ctx.beginPath();ctx.ellipse(0,0,e.size*expand,25*expand,0,0,7);ctx.stroke();if(c===colors.thunder){bolt(-e.size*.7,0,0,-12,c,3,e.age*18);bolt(0,-12,e.size*.7,0,c,3,e.age*18+2);}}ctx.restore();}
function render(){syncKOVisual();const sceneFighters=phase==='menu'||phase==='lobby'?[]:window.riftNet?.fullRollback?rollbackSceneFighters():onlineGuest()?fighters.map((f,i)=>i===1&&predicted?{...predicted,x:predicted.x+predictionOffset.x,y:predicted.y+predictionOffset.y}:i===0&&Number.isFinite(f.netDrawX)?{...f,x:f.netDrawX,y:f.netDrawY}:f):fighters;const size=renderViewport(),cw=size.width,ch=size.height;if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}ctx.setTransform(1,0,0,1,0,0);const scale=Math.min(cw/W,ch/H),offsetX=(cw-W*scale)/2,offsetY=(ch-H*scale)/2;
if(separateBackground){ctx.clearRect(0,0,cw,ch);const key=cw+'x'+ch+':'+!!(map.complete&&map.naturalWidth);if(backdropKey!==key){arenaBackground.width=cw;arenaBackground.height=ch;backgroundContext.setTransform(1,0,0,1,0,0);backgroundContext.fillStyle='#17121a';backgroundContext.fillRect(0,0,cw,ch);backgroundContext.setTransform(scale,0,0,scale,offsetX,offsetY);if(map.complete&&map.naturalWidth){backgroundContext.drawImage(map,0,0,W,H);backgroundContext.fillStyle='#1c122b21';backgroundContext.fillRect(0,0,W,H);}backdropKey=key;}ctx.setTransform(scale,0,0,scale,offsetX,offsetY);}
else{ctx.fillStyle='#17121a';ctx.fillRect(0,0,cw,ch);ctx.setTransform(scale,0,0,scale,offsetX,offsetY);if(map.complete&&map.naturalWidth){const key=cw+'x'+ch;if(backdropKey!==key){backdrop=document.createElement('canvas');backdrop.width=cw;backdrop.height=ch;const bg=backdrop.getContext('2d');bg.drawImage(map,0,0,cw,ch);bg.fillStyle='#1c122b21';bg.fillRect(0,0,cw,ch);backdropKey=key;}ctx.drawImage(backdrop,0,0,W,H);}}
const grabView=fighters.some(f=>f.mox?.action?.grab),panTarget=grabView?Math.max(0,250-Math.min(...fighters.map(f=>f.y))):0,panDt=clamp(time-cameraClock,0,.05);cameraClock=time;cameraPan+=(panTarget-cameraPan)*(1-Math.exp(-panDt*10));const recoil=cameraShake();if(separateBackground){const displayScale=Math.min(viewport.width/W,viewport.height/H),transform='translate3d('+(recoil.x*displayScale).toFixed(2)+'px,'+((cameraPan+recoil.y)*displayScale).toFixed(2)+'px,0)';if(arenaBackground.style.transform!==transform)arenaBackground.style.transform=transform;}ctx.save();ctx.translate(recoil.x,cameraPan+recoil.y);
for(let i=0;i<24;i++){ctx.globalAlpha=.12+Math.sin(time+i)*.08;ctx.fillStyle=i%2?'#f8d6bb':'#dca8c3';ctx.beginPath();ctx.arc((i*131+Math.sin(time*.2+i)*20)%W,150+(i*79-time*10)%750,1.7,0,7);ctx.fill();}ctx.globalAlpha=1;
for(const f of sceneFighters)if(f.mox)window.MoxVisual.back(ctx,f,fighters[1-f.id],time);
for(const f of sceneFighters)if(f.frost)window.CylastVisual.back(ctx,f,fighters[1-f.id],time);
for(const f of sceneFighters)drawBleedFog(f,false);
for(const f of sceneFighters){if(f.fairi){window.FairiVisual.character(ctx,f,fighters[1-f.id],time,{surface:(x,y)=>cylastEnv(f).surface(x,y),quality:graphicsQuality==='low'?'low':'high',bodyColor:window.FairiVisual.bodyColor(f,alternateFighter(f)),palette:alternateFighter(f)?fighterContext(f):ctx,viewer:mode==='pvp'||f.id!==localId()?'enemy':'owner'});continue;}if(f.melanta){ctx.save();try{window.MelantaVisual.character(fighterContext(f),f,fighters[1-f.id],time,floor(f.x));}finally{ctx.restore();}continue;}if(f.mox){ctx.save();window.MoxVisual.character(fighterContext(f),f,fighters[1-f.id],time,f.ground?f.y:floor(f.x));ctx.restore();ctx.fillStyle=fighterColor(f);ctx.textAlign='center';ctx.font='bold 11px Arial';ctx.fillText((f.id?(mode==='pve'?'CPU':'P2'):'P1')+' · '+(f.mox.p.form?'ĐÁNH XA':'CẬN CHIẾN'),f.x,f.y-235);continue;}if(f.frost){ctx.save();if(f.turn){ctx.translate(f.x,f.y-85);ctx.rotate(f.turn);ctx.translate(-f.x,-f.y+85);}window.CylastVisual.character(fighterContext(f),f,time);ctx.restore();ctx.textAlign='center';ctx.font='bold 11px Arial';ctx.fillStyle=fighterColor(f);ctx.fillText(f.id?(mode==='pve'?'CPU':'P2'):'P1',f.x,f.y-250);continue;}ctx.fillStyle='#0c071b44';ctx.beginPath();ctx.ellipse(f.x,f.ground?f.y+5:floor(f.x)+5,50,8,0,0,7);ctx.fill();ctx.save();if(f.turn){ctx.translate(f.x,f.y-85);ctx.rotate(f.turn);ctx.translate(-f.x,-f.y+85);}if(f.flash){ctx.filter='brightness(2)';}if(f.type==='soul')window.drawSoul(fighterContext(f),f,time,true);else thunderDraw(f,fighterContext(f));ctx.restore();drawBlade(f);ctx.textAlign='center';ctx.font='bold 11px Arial';ctx.fillStyle=fighterColor(f);ctx.fillText(f.id?(mode==='pve'?'CPU':'P2'):'P1',f.x,f.y-250);if(f.stunUntil>time){const sy=f.y-230;ctx.save();ctx.strokeStyle=colors.thunder;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(f.x,sy,28,7,0,0,7);ctx.stroke();for(let j=0;j<3;j++){const theta=time*5+j*Math.PI*2/3;ctx.fillStyle='#fff6a4';ctx.font='18px Arial';ctx.fillText('✦',f.x+Math.cos(theta)*28,sy+Math.sin(theta)*7+5);}ctx.fillStyle='#fff3a0';ctx.font='bold 12px Arial';ctx.fillText('CHOÁNG '+Math.max(0,f.stunUntil-time).toFixed(1)+'s',f.x,sy-20);ctx.restore();}if(f.freezeUntil>time||f.rootUntil>time){ctx.fillStyle=colors.cylast;ctx.fillText((f.freezeUntil>time?'ĐÓNG BĂNG ':'TRÓI CHÂN ')+(Math.max(f.freezeUntil||0,f.rootUntil||0)-time).toFixed(1)+'s',f.x,f.y-255);}}
for(const f of sceneFighters)drawBleedFog(f,true);
for(const f of sceneFighters)if(f.mox)window.MoxVisual.front(ctx,f,fighters[1-f.id],time);
for(const f of sceneFighters)if(f.frost)window.CylastVisual.front(ctx,f,fighters[1-f.id],time);
for(const shot of shots){const extrapolate=onlineGuest()&&Number.isFinite(shot.netAt)?Math.max(0,Math.min(.075,time-shot.netAt)):0;const s=extrapolate?{...shot,x:shot.x+shot.vx*extrapolate,y:shot.y+(shot.vy||0)*extrapolate,age:shot.age+extrapolate}:shot;if(s.kind==='frost'){window.CylastVisual.projectile(ctx,s);continue;}ctx.save();ctx.shadowBlur=24;ctx.shadowColor=colors.thunder;ctx.fillStyle=colors.thunder;ctx.beginPath();ctx.arc(s.x,s.y,17,0,7);ctx.fill();ctx.fillStyle='#fffbea';ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();ctx.restore();bolt(s.x-Math.sign(s.vx)*70,s.y,s.x,s.y,colors.thunder,2,s.age*18);}
for(const e of effects)drawArenaEffect(e);for(const f of sceneFighters)if(f.melanta){ctx.save();try{window.MelantaVisual.front(fighterContext(f),f,fighters[1-f.id],time,floor(f.x));}finally{ctx.restore();}}for(const f of sceneFighters)if(f.melanta)window.MelantaVisual.frame(ctx,f,fighters[1-f.id],time,floor(f.x),W,H);if(phase==='finishing'&&melantaKiller!=null){const f=fighters[melantaKiller];window.MelantaVisual.finisher(ctx,f,fighters[1-f.id],time,floor(f.x),(FINISH_CONFIG.duration-finishLeft)*FINISH_CONFIG.melantaTimeline/FINISH_CONFIG.duration,W,H);}ctx.restore();if(window.riftNet?.fullRollback)for(const f of sceneFighters)for(const k of ['poseLayers','poseClock','poseKey'])fighters[f.id][k]=f[k];}
let acc=0,hudClock=0,paintClock=0,lastPaintPhase='',lastPaintNow=0;
function frame(now){const dt=Math.min((now-last)/1000||.016,.08);last=now;
if(onlineActive()&&window.riftNet.fullRollback){acc=0;}else if(onlineGuest()){advanceGuest(dt);acc=0;}else if(!['paused','roundover','matchover'].includes(phase)){acc+=dt;let count=0;while(acc>=1/120&&count++<10){step(1/120);acc-=1/120;}}else acc=0;
window.riftNet?.frame?.(dt);hitMeterHUD();if(!window.riftNet?.fullRollback)syncZoneSound();hudClock+=dt;if(hudClock>.1){hud();hudClock=0;touchHUD();textIfChanged($('fps'),Math.round(fps)+' FPS');if(canvas.dataset){canvas.dataset.renderMs=renderAverage.toFixed(2);canvas.dataset.renderScale=renderScale.toFixed(2);}}
paintClock+=dt;const frozen=['paused','roundover','matchover','lobby'].includes(phase);if((paintClock>=1/graphicsFps-.001||viewportDirty||lastPaintPhase!==phase)&&(!frozen||lastPaintPhase!==phase||viewportDirty)){if(lastPaintNow)fps+=(1000/Math.max(1,now-lastPaintNow)-fps)*.08;lastPaintNow=now;const begin=performance.now();render();tuneRender(performance.now()-begin,paintClock);paintClock=Math.max(0,paintClock-1/graphicsFps);if(paintClock>1/graphicsFps)paintClock=0;lastPaintPhase=phase;comboHUD();}else if(frozen)paintClock=0;
requestAnimationFrame(frame);}
const mapping={Space:[0,'attack'],KeyQ:[0,'q'],KeyW:[0,'w'],KeyE:[0,'e'],KeyR:[0,'r'],KeyJ:[0,'jump'],Enter:[1,'attack'],Digit1:[1,'q'],Digit2:[1,'w'],Digit3:[1,'e'],Digit4:[1,'r'],Numpad1:[1,'q'],Numpad2:[1,'w'],Numpad3:[1,'e'],Numpad4:[1,'r'],ArrowUp:[1,'jump']};
// Capture game keys independently of the last menu/select/button focus.
function inputCode(e){if(e.code)return e.code;const k=e.key||'';if(k.length===1&&/[a-z]/i.test(k))return 'Key'+k.toUpperCase();if(/^[1-4]$/.test(k))return 'Digit'+k;return k===' '?'Space':k;}
function keydown(e){
 if(window.sceneTransition?.busy){e.preventDefault();return;}
 if($('help').open||$('settings').open||e.target?.closest?.('input,select,textarea,summary'))return;
 const code=inputCode(e),playing=['fight','countdown'].includes(phase);
 if(!playing&&code!=='Escape')return;
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','KeyA','KeyD','KeyJ','KeyS','KeyQ','KeyW','KeyE','KeyR','Digit1','Digit2','Digit3','Digit4'].includes(code))e.preventDefault();
 keys[code]=true;
 if(e.repeat)return;
 if(onlineActive()){if(code==='Escape'){pause();return;}if(code==='KeyS'||code==='ArrowDown'){localAction('drop');return;}const skill=code==='ArrowUp'?'jump':mapping[code]?.[1];if(skill)localAction(skill);return;}
 if(code==='Escape'){pause();return;}
 if((code==='KeyS'||code==='ArrowDown')&&phase==='fight'){const id=code==='KeyS'||mode==='pve'||mode==='sandbox'?0:1;const f=fighters[id];if(f&&!isStunned(f)){f.drop=.3;f.y+=15;}return;}
 const mapped=code==='ArrowUp'&&(mode==='pve'||mode==='sandbox')?[0,'jump']:mapping[code];
 if(mapped&&!(mapped[0]===1&&(mode==='pve'||mode==='sandbox')))request(fighters[mapped[0]],mapped[1]);
}
function keyup(e){keys[inputCode(e)]=false;}
window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);
canvas.addEventListener('pointerdown',focusGame);
window.addEventListener('blur',()=>{keys={};if(phase==='fight'||phase==='countdown'||phase==='finishing')pause();});
function changeScene(change){keys={};heldPointers.clear();actionPointers.clear();refreshMoveButtons();refreshActionButtons();if(window.sceneTransition)window.sceneTransition.run(change);else change();}
$('start').onclick=()=>changeScene(start);$('pause').onclick=pause;$('back').onclick=()=>changeScene(menu);function continueLocal(){if(phase==='paused'){pause();return;}if(phase==='matchover'){start();return;}if(phase==='roundover'){if(fighters[0].hp!==fighters[1].hp)round++;setupRound();}}
$('continue').onclick=()=>onlineActive()?window.riftNet.confirm():phase==='paused'?continueLocal():changeScene(continueLocal);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('selected',el===b));$('difficultyLabel').hidden=mode!=='pve';$('sandboxHint').hidden=mode!=='sandbox';$('onlinePanel').hidden=mode!=='online';$('start').hidden=mode==='online';$('opponentLabel').hidden=mode==='online';$('select0').parentElement.firstChild.textContent=mode==='online'?'CHIẾN BINH CỦA BẠN':'CHIẾN BINH P1';if(mode!=='online'&&window.riftNet?.room)window.riftNet.leave();$('opponentLabel').firstChild.textContent=mode==='pvp'?'CHIẾN BINH P2':'ĐỐI THỦ';});
$('hud').addEventListener('click',e=>{const b=e.target.closest('[data-skill]');if(b){if(onlineActive()){if(+b.dataset.fighter===localId())localAction(b.dataset.skill);}else if(b.dataset.fighter==='0'||mode==='pvp')request(fighters[+b.dataset.fighter],b.dataset.skill);}});$('sound').onclick=()=>window.sagaAudio?.toggle();$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('arena').requestFullscreen)await $('arena').requestFullscreen();else document.body.classList.toggle('immersive');}catch(e){document.body.classList.toggle('immersive');}};
$('closeHelp').onclick=()=>$('help').close();$('help').addEventListener('close',()=>document.body.classList.remove('help-open'));
for(const id of ['settingsButton','pauseSettings'])$(id).onclick=()=>{if(['fight','countdown','finishing'].includes(phase))pause();window.controlSettings.open();};
$('sandboxFree').onchange=()=>{sandboxOptions.free=$('sandboxFree').checked;if(sandboxOptions.free)for(const f of fighters)resetCooldowns(f);};$('sandboxAI').onchange=()=>{sandboxOptions.ai=$('sandboxAI').value==='ai';};$('sandboxReset').onclick=resetSandbox;$('sandboxDistance').onchange=()=>{sandboxOptions.distance=clamp(Number($('sandboxDistance').value)||150,40,1000);resetSandbox();};$('sandboxDefend').onchange=()=>{sandboxOptions.defend=$('sandboxDefend').checked;};for(const [id,key] of [['tuneBuffer','buffer'],['tunePoints','extensions'],['tuneBudget','controlBudget']])$(id).onchange=()=>{const value=Number($(id).value);if(Number.isFinite(value))sandboxTuning[key]=key==='buffer'?clamp(value,100,250)/1000:key==='extensions'?clamp(value,0,4):clamp(value,1,5);resetSandbox();};
// Pointer IDs keep movement independent from simultaneous attack/jump fingers on iOS.
const heldPointers=new Map(),actionPointers=new Map();
const moveButtons=[...document.querySelectorAll('[data-hold]')],actionButtons=[...document.querySelectorAll('[data-do]')];
function refreshMoveButtons(){for(const b of moveButtons)b.classList.toggle('pressed',[...heldPointers.values()].includes(b.dataset.hold));}
function setTouchDirection(id,code){const old=heldPointers.get(id);heldPointers.set(id,code);if(old&&![...heldPointers.values()].includes(old))keys[old]=false;if(code)keys[code]=true;refreshMoveButtons();}
function releaseTouch(id){const code=heldPointers.get(id);heldPointers.delete(id);if(code&&![...heldPointers.values()].includes(code))keys[code]=false;refreshMoveButtons();}
function refreshActionButtons(){for(const b of actionButtons)b.classList.toggle('pressed',[...actionPointers.values()].some(p=>p.button===b));}
function endActionPointer(id){actionPointers.delete(id);refreshActionButtons();}
for(const b of moveButtons){
 b.addEventListener('pointerdown',e=>{e.preventDefault();setTouchDirection(e.pointerId,b.dataset.hold);try{b.setPointerCapture(e.pointerId);}catch{}});
 b.addEventListener('pointermove',e=>{if(!heldPointers.has(e.pointerId))return;e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY),next=target?.closest('[data-hold]');if(next)setTouchDirection(e.pointerId,next.dataset.hold);else if(!target?.closest('.touch-move'))setTouchDirection(e.pointerId,null);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>releaseTouch(e.pointerId));
}
for(const b of actionButtons){
 b.addEventListener('pointerdown',e=>{e.preventDefault();actionPointers.set(e.pointerId,{button:b,visited:new Set([b.dataset.do])});refreshActionButtons();localAction(b.dataset.do);try{b.setPointerCapture(e.pointerId);}catch{}});
 b.addEventListener('pointermove',e=>{const pointer=actionPointers.get(e.pointerId);if(!pointer)return;e.preventDefault();const next=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-do]');if(!next||pointer.visited.has(next.dataset.do))return;pointer.visited.add(next.dataset.do);pointer.button=next;refreshActionButtons();localAction(next.dataset.do);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>endActionPointer(e.pointerId));
}
$('touch').addEventListener('contextmenu',e=>e.preventDefault());
$('touchToggle').onclick=()=>{document.body.classList.toggle('show-touch');window.controlSettings?.refresh();};
$('touchPause').onclick=pause;
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys={};heldPointers.clear();actionPointers.clear();refreshMoveButtons();refreshActionButtons();if(['fight','countdown','finishing'].includes(phase))pause();}});
function touchHUD(){const f=fighters[localId()];if(!f)return;for(const b of document.querySelectorAll('.touch-skills [data-do]')){const k=b.dataset.do;b.classList.toggle('cancel-ready',cancelReady(f,k));const charge=k==='q'&&(f.type==='soul'||f.fairi);const cd=charge?Math.max(f.cd.q,f.charges?0:Math.min(...f.qRecharge)):f.cd[k];textIfChanged(b.querySelector('small'),f.frost&&k==='w'&&f.frost.zones.some(z=>z.k==='w')?'ĐANG RƠI':k==='w'&&f.blade?'DỊCH CHUYỂN':charge&&cd>0?cd.toFixed(1)+'s':charge?f.charges+'/'+(f.fairi?3:2):cd>0?cd.toFixed(1)+'s':'');b.classList.toggle('cooling',cd>0);}}
function advanceGuest(dt){if(window.riftNet?.blocked)return;if(phase==='finishing'&&melantaKiller!=null){finishLeft=Math.max(0,finishLeft-dt);return;}if(!['paused','roundover','matchover','lobby'].includes(phase)){const v=phase==='finishing'?FINISH_CONFIG.speed:1;time+=dt*v;shake*=Math.exp(-dt*v*14);moxShake*=Math.exp(-dt*v*8);for(const f of fighters){if(f.fairi)window.FairiCombat.visual(f,dt*v);if(f.melanta)window.MelantaCombat.visual?.(f,dt*v,fighters[1-f.id]);if(f.action)f.action.age+=dt*v;if(f.mox)window.MoxCombat.visual(f,dt*v,fighters[1-f.id]);if(f.frost){window.CylastCombat.visual(f,fighters[1-f.id],dt*v);for(const z of f.frost.zones){z.age+=dt*v;z.life-=dt*v;}}for(const k of moves)f.cd[k]=Math.max(0,f.cd[k]-dt*v);if(Number.isFinite(f.netTurn))f.turn+=(Math.atan2(Math.sin(f.netTurn-f.turn),Math.cos(f.netTurn-f.turn)))*(1-Math.exp(-dt*24));if(Number.isFinite(f.netDrawX)){f.netDrawX+=(f.netX-f.netDrawX)*(1-Math.exp(-dt*30));f.netDrawY+=(f.netY-f.netDrawY)*(1-Math.exp(-dt*30));}f.x+=(f.netX-f.x)*(1-Math.exp(-dt*24));f.y+=(f.netY-f.y)*(1-Math.exp(-dt*24));}for(const e of effects)e.age+=dt*v;effects=effects.filter(e=>e.age<e.life);}}
function clonePrediction(f){
 const {poseLayers,poseClock,poseKey,pveAI,netDrawX,netDrawY,netX,netY,netTurn,...state}=f;
 const v=JSON.parse(JSON.stringify(state));if(v.normal)v.action=v.normal;if(v.mox)v.mox=Object.assign(window.MoxCombat.init(),v.mox);return v;
}
let predictionTime=0,predictionReplay=false,predictionHistory=[];
const predictionStats={reconciliations:0,replayedFrames:0,lastReplayFrames:0,lastReplayMs:0,lastErrorPx:0,hardCorrections:0,historyFrames:0};
function withPrediction(fn){
 if(!predicted||!predictionEnemy)return;
 const saved={fighters,time,predicting,shots,effects,shake,moxShake};
 fighters=[predictionEnemy,predicted];time=predictionTime;predicting=true;shots=[];effects=[];
 try{fn(predicted);}finally{fighters=saved.fighters;time=saved.time;predicting=saved.predicting;shots=saved.shots;effects=saved.effects;shake=saved.shake;moxShake=saved.moxShake;}
}
function predictAction(event){if(!predicted||phase!=='fight'||window.riftNet?.blocked)return;withPrediction(f=>{if(event.k==='drop'){if(!isStunned(f)&&f.rootUntil<=time){f.drop=.3;f.y+=15;}}else if(event.k!=='pause'&&event.k!=='ready')request(f,event.k);});}
function predictStep(frame,dt){
 if(!predicted||phase!=='fight')return;
 dt=Math.min(Math.max(dt,0),1/30);predictionTime+=dt;
 if(!predictionReplay){predictionOffset.x*=Math.exp(-dt*24);predictionOffset.y*=Math.exp(-dt*24);}
 withPrediction(f=>{
  f.move=frame.move;
  // Captures remain authoritative. Other motion/actions use the SAME fixed-step
  // fighter update as host, isolated from real damage, VFX, sound and camera.
  if(f.grabbedBy!=null||f.mox?.action?.grab)return;
  updateFighter(f,dt);
 });
 predictionHistory.push({seq:frame.seq,at:predictionTime,x:predicted.x,y:predicted.y,vx:predicted.vx,vy:predicted.vy});
 if(predictionHistory.length>240)predictionHistory.shift();predictionStats.historyFrames=predictionHistory.length;
}
function reconcilePrediction(frames,events,s){
 const started=performance.now(),previous=predicted;
 const old=previous?{x:previous.x+predictionOffset.x,y:previous.y+predictionOffset.y,ground:previous.ground}:null;
 const lastHurt=previous?.lastHurt??-Infinity;
 predictionOffset={x:0,y:0};predictionTime=s.time;predictionHistory=[];predictionStats.historyFrames=0;
 predicted=clonePrediction(fighters[1]);predictionEnemy=clonePrediction(fighters[0]);
 if(previous?.type===predicted.type){predicted.poseLayers=previous.poseLayers;predicted.poseClock=previous.poseClock;predicted.poseKey=previous.poseKey;}
 if(phase!=='fight'){predicted=null;predictionStats.historyFrames=0;return;}
 const replay=frames.slice(-240);let next=0;predictionReplay=true;
 try{
  for(const frame of replay){while(next<events.length&&events[next].seq<=frame.seq)predictAction(events[next++]);predictStep(frame,1/120);}
  while(next<events.length)predictAction(events[next++]);
 }finally{predictionReplay=false;}
 const error=old?Math.hypot(old.x-predicted.x,old.y-predicted.y):0;
 const controlChange=predicted.lastHurt>lastHurt||predicted.grabbedBy!=null||predicted.mox?.action?.grab||predicted.hp<=0;
 if(old&&!controlChange&&error<120){predictionOffset.x=old.x-predicted.x;predictionOffset.y=old.ground===predicted.ground?old.y-predicted.y:0;}
 else if(old&&error>.5)predictionStats.hardCorrections++;
 predictionStats.reconciliations++;predictionStats.replayedFrames+=replay.length;predictionStats.lastReplayFrames=replay.length;predictionStats.lastReplayMs=performance.now()-started;predictionStats.lastErrorPx=error;
}
function rollbackViewSample(f){return {type:f.type,x:f.x,y:f.y,turn:f.turn||0,lastHurt:f.lastHurt,hp:f.hp,ground:f.ground,grabbedBy:f.grabbedBy,grab:!!f.mox?.action?.grab||!!(f.fairi&&f.action?.k==='r'),phase};}
function rollbackViewSnap(a,b){return !a||a.type!==b.type||a.phase!==b.phase||b.lastHurt>a.lastHurt||b.hp<=0||a.grabbedBy!==b.grabbedBy||b.grabbedBy!=null||a.grab||b.grab||Math.hypot(b.x-a.x,b.y-a.y)>80;}
function rollbackSceneFighters(){return fighters.map((f,i)=>{const v=rollbackView[i],o=rollbackDraw[i];let x=f.x,y=f.y,turn=f.turn||0;if(v&&!v.snap&&v.b.type===f.type){const t=clamp(rollbackAlpha,0,1);x=v.a.x+(v.b.x-v.a.x)*t;y=v.a.ground!==v.b.ground&&v.b.ground?v.b.y:v.a.y+(v.b.y-v.a.y)*t;turn=v.a.turn+Math.atan2(Math.sin(v.b.turn-v.a.turn),Math.cos(v.b.turn-v.a.turn))*t;}return {...f,x:x+o.x,y:y+o.y,turn};});}
const rollbackAdapter={
 capture(){return {fighters,effects,shots,time,remaining,countdown,finishLeft,phase,pausedFrom,score,round,simTick,shake,moxShake,melantaKiller,sfxSerial,sfxEvents,rollbackMessage,rollbackReady,rollbackRng};},
 restore(s){const poses=fighters.map(f=>({type:f.type,poseLayers:f.poseLayers,poseClock:f.poseClock,poseKey:f.poseKey}));({fighters,effects,shots,time,remaining,countdown,finishLeft,phase,pausedFrom,score,round,simTick,shake,moxShake,melantaKiller,sfxSerial,sfxEvents,rollbackMessage,rollbackReady,rollbackRng}=s);for(const f of fighters){if(f.mox)Object.setPrototypeOf(f.mox,Object.getPrototypeOf(window.MoxCombat.init()));const p=poses[f.id];if(p?.type===f.type){f.poseLayers=p.poseLayers;f.poseClock=p.poseClock;f.poseKey=p.poseKey;}}},
 seed(seed){rollbackAdapter.resetView();rollbackRng=seed>>>0||1;rollbackReady=[false,false];rollbackMessage=null;rollbackCommitted=null;rollbackPlayed=0;time=0;simTick=0;sfxSerial=0;sfxEvents=[];},
 step(inputs){const savedKeys=keys,random=Math.random;rollbackDriving=true;rollbackInputs=inputs;Math.random=()=>{rollbackRng^=rollbackRng<<13;rollbackRng^=rollbackRng>>>17;rollbackRng^=rollbackRng<<5;return (rollbackRng>>>0)/4294967296;};try{
 if(inputs.some(f=>f.a.includes('pause')))pause();
 for(let id=0;id<2;id++)for(const k of inputs[id].a){if(k==='pause')continue;if(k==='ready'){if(['roundover','matchover'].includes(phase))rollbackReady[id]=true;}else window.riftGame.action(id,k);}
 if(rollbackReady.every(Boolean)&&['roundover','matchover'].includes(phase)){if(phase==='matchover'){score=[0,0];round=1;}else if(fighters[0].hp!==fighters[1].hp)round++;fighters=[makeFighter($('select0').value,0),makeFighter($('select1').value,1)];effects=[];shots=[];remaining=99;finishLeft=0;countdown=3.65;phase='countdown';melantaKiller=null;shake=0;moxShake=0;sfxEvents=[];rollbackReady=[false,false];rollbackMessage=null;}
 if(['paused','roundover','matchover'].includes(phase))simTick++;else step(1/120);
 const normalized=rollbackAdapter.capture();window.SagaRollback?.canonicalize(normalized);({time,remaining,countdown,finishLeft,shake,moxShake}=normalized);
 }finally{Math.random=random;keys=savedKeys;rollbackInputs=null;rollbackDriving=false;}},
 commit(state){rollbackCommitted=state;for(const e of state.sfxEvents)if(e.seq>rollbackPlayed){window.sagaAudio?.play(e.id,e);rollbackPlayed=e.seq;}rollbackPlayed=Math.max(rollbackPlayed,state.sfxSerial);},
 resetView(){rollbackDraw=[{x:0,y:0},{x:0,y:0}];rollbackView=[null,null];rollbackAlpha=1;rollbackPrevious=null;window.MelantaVisual?.reset();window.FairiVisual?.reset();},
 beforeAdvance(){rollbackTickBefore=fighters.map(rollbackViewSample);},
 afterAdvance(replay=false){for(const f of fighters){const b=rollbackViewSample(f),a=rollbackTickBefore?.[f.id]||b,snap=rollbackViewSnap(a,b);rollbackView[f.id]={a,b,snap};if(snap&&!replay)rollbackDraw[f.id]={x:0,y:0};}},
 view:()=>rollbackSceneFighters().map(f=>({id:f.id,x:f.x,y:f.y,turn:f.turn})),
 beforeRollback(){rollbackPrevious=fighters.map((f,i)=>({x:f.x+rollbackDraw[i].x,y:f.y+rollbackDraw[i].y,lastHurt:f.lastHurt,ground:f.ground}));},
 corrected(){for(const f of fighters){const old=rollbackPrevious?.[f.id],dx=old?old.x-f.x:0,dy=old?old.y-f.y:0;const soft=old&&f.lastHurt<=old.lastHurt&&f.hp>0&&f.grabbedBy==null&&!f.mox?.action?.grab&&!rollbackView[f.id]?.snap&&Math.hypot(dx,dy)<140;rollbackDraw[f.id]={x:soft?dx:0,y:soft&&old.ground===f.ground?dy:0};if(!soft){if(f.melanta)window.MelantaVisual?.reset(f.id);if(f.fairi)window.FairiVisual?.reset(f.id);}}},
 present(dt=0,alpha=1){rollbackAlpha=clamp(alpha,0,1);for(const o of rollbackDraw){o.x*=Math.exp(-dt*26);o.y*=Math.exp(-dt*26);}const s=rollbackCommitted;if(!s)return;const currentPhase=phase,currentScore=score,currentMessage=rollbackMessage;phase=s.phase;score=s.score;try{document.body.classList.toggle('paused',phase==='paused');syncKOVisual();updateCountdownBanner();if(['paused','roundover','matchover'].includes(phase)&&s.rollbackMessage){const m=s.rollbackMessage;showMessage(m.sub,m.title,m.detail,phase==='paused'?'TIẾP TỤC':'SẴN SÀNG');const id=localId();$('continue').disabled=s.rollbackReady[id];$('continue').textContent=s.rollbackReady[id]?'ĐANG CHỜ ĐỐI THỦ…':phase==='paused'?'TIẾP TỤC':'SẴN SÀNG';}else $('message').hidden=true;hud();const liveFighters=fighters;fighters=s.fighters;try{syncZoneSound();}finally{fighters=liveFighters;}}finally{phase=currentPhase;score=currentScore;rollbackMessage=currentMessage;}},
};
window.riftGame={rollback:rollbackAdapter,renderMetrics:()=>({paintFps:fps,renderMs:renderAverage,renderScale,frameMs:frameAverage,quality:graphicsQuality,fpsCap:graphicsFps}),
 surface:(x,y)=>cylastEnv(fighters[0]).surface(x,y),simulationTick:()=>simTick,predictAction,predictStep,reconcilePrediction,predictionMetrics:()=>({...predictionStats,clock:predictionTime}),resetPrediction(){predicted=null;predictionEnemy=null;predictionTime=0;predictionHistory=[];predictionStats.historyFrames=0;predictionOffset={x:0,y:0};keys={};},
 getPhase:()=>phase,getMode:()=>mode,getMove:()=>((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0),
 configure(config){$('select0').value=config.p1;$('select1').value=config.p2;mode='online';},
 begin(){remoteMove=0;start();window.sceneTransition?.reveal();},lobby(){phase='lobby';keys={};},menu:()=>changeScene(menu),
 action(id,k){if(k==='pause'){pause();return;}if(k==='drop'){const f=fighters[id];if(phase==='fight'&&!isStunned(f)){f.drop=.3;f.y+=15;}return;}request(fighters[id],k);},
 remote(move){remoteMove=move;},continue:continueLocal,pause,focus:focusGame,
 snapshot(){return {melantaKiller,fighters:fighters.map(f=>{const {poseLayers,poseClock,poseKey,...data}=f;return data;}),effects:effects.slice(-64),shake,moxShake,shots,time,remaining,countdown,finishLeft,phase,pausedFrom,score,round,sfx:{serial:sfxSerial,events:sfxEvents.slice()},message:{sub:$('messageSub').textContent,title:$('messageTitle').textContent,detail:$('messageDetail').textContent,button:$('continue').textContent}};},
 receive(s){melantaKiller=s.melantaKiller??null;const previousPhase=phase;const configure=fighters[0]?.type!==s.fighters[0].type||fighters[1]?.type!==s.fighters[1].type||!document.body.classList.contains('playing');
 fighters=s.fighters.map((f,i)=>{const old=fighters[i];if(f.mox)for(const ball of f.mox.balls){const previous=old?.mox?.balls?.find(b=>b.hitId===ball.hitId);if(!ball.trail?.length)ball.trail=previous?.trail||[];}const smooth=i===0&&old&&phase===s.phase&&!isStunned(f)&&Math.hypot(old.x-f.x,old.y-f.y)<180;return {...f,netDrawX:smooth?(old.netDrawX??old.x):f.x,netDrawY:smooth?(old.netDrawY??old.y):f.y,netTurn:f.turn||0,netX:f.x,netY:f.y,poseLayers:old?.poseLayers,poseClock:old?.poseClock,poseKey:old?.poseKey};});effects=s.effects;shake=s.shake||0;moxShake=s.moxShake||0;shots=s.shots.map(shot=>({...shot,netAt:s.time}));time=s.time;remaining=s.remaining;countdown=s.countdown;finishLeft=s.finishLeft;phase=s.phase;document.body.classList.toggle('paused',phase==='paused');pausedFrom=s.pausedFrom;syncKOVisual();score=s.score;round=s.round;document.body.classList.add('playing');$('hud').hidden=false;$('menu').hidden=true;
 if(configure){configureHUD();window.sceneTransition?.reveal();}$('modeTag').textContent='ONLINE / PHÒNG '+window.riftNet.room;$('label0').textContent='CHỦ PHÒNG';$('label1').textContent='BẠN · P2';
 updateCountdownBanner();
 if(['paused','roundover','matchover'].includes(phase))showMessage(s.message.sub,s.message.title,s.message.detail,phase==='paused'?'TIẾP TỤC':'SẴN SÀNG');else $('message').hidden=true;hud();hitMeterHUD();if(s.phase==='paused'&&previousPhase!=='paused')window.sagaAudio?.stopCombat();receiveSound(s);
 }
};
window.duel={get state(){return {phase,fighters,shots,score,round,remaining,time,platforms};},request:(id,k)=>request(fighters[id],k),start,step,render};menu();window.sceneTransition?.reveal();requestAnimationFrame(frame);
// Keep the gamepad inside the fullscreen subtree on browsers that support it.
document.addEventListener('fullscreenchange',()=>{const pad=$('touch');if(document.fullscreenElement===$('arena')){$('arena').appendChild(pad);pad.classList.add('fullscreen-pad');}else if(pad.classList.contains('fullscreen-pad')){pad.classList.remove('fullscreen-pad');document.querySelector('main').insertBefore(pad,document.querySelector('.rotate-hint'));}});

$('aiDebugEnabled').addEventListener('change',e=>window.SagaAI.setDebug(e.target.checked));
