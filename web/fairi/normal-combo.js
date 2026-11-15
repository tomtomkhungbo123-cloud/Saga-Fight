'use strict';
const FairiNormal=(()=>{
 const stages=[
 {name:'N1',duration:.36,hitStart:.115,hitEnd:.22,chainAt:.255,wind:[-1.15,-2.1,-1.4],strike:[1.35,2.0,-1.65],follow:[1.1,.3,.6],lean:.29},
 {name:'N2',duration:.38,hitStart:.12,hitEnd:.23,chainAt:.27,wind:[1.5,.65,-.5],strike:[1.1,2.4,-2.2],follow:[.4,2.9,-2.9],lean:.22},
 {name:'N3',duration:.48,hitStart:.155,hitEnd:.30,chainAt:null,wind:[.15,2.9,-2.7],strike:[1.4,1.8,-1.3],follow:[1.0,.3,.2],lean:.39}
 ];
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
 function sample(stage,u,hand){let s=stages[stage]||stages[0],guard=hand?[.36,.18,0]:[-.30,-.20,0],times=[0,.22,.44,.65,1],keys=[guard,s.wind,s.strike,s.follow,guard],i=0;while(i<3&&u>times[i+1])i++;let w=smooth((u-times[i])/(times[i+1]-times[i])),active=keys[i].map((v,j)=>mix(v,keys[i+1][j],w));return {active,guard:[-.65,1.0,-.55],weight:smooth(u/.16)*(1-smooth((u-.72)/.28)),lean:s.lean*smooth(u/.24)*(1-smooth((u-.65)/.35))}}
 return {stages,resetWindow:.62,blendTime:.075,sample,smooth};
})();
if(typeof module!=='undefined')module.exports=FairiNormal;
