// Headless CPU cost of the actual AI during simulation; excludes Canvas/GPU/browser overhead.
const fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'../tests/melanta.test.cjs'),'utf8').split('function mel()')[0].replaceAll('__dirname',JSON.stringify(path.join(__dirname,'../tests')));
source+=`
c.aiBenchmarkNow=()=>require('node:perf_hooks').performance.now();
run('var aiCosts=[],originalAI=ai;ai=function(dt){const at=aiBenchmarkNow();originalAI(dt);aiCosts.push(aiBenchmarkNow()-at);};');
for(const type of ['thunder','soul','cylast','mox','melanta'])for(const level of ['easy','normal','hard','hell']){reset('thunder');run("$('select1').value='"+type+"';$('difficulty').value='"+level+"';mode='pve';start();phase='fight';");advance(8);}
const samples=run('aiCosts').sort((a,b)=>a-b);console.log(JSON.stringify({calls:samples.length,meanMicroseconds:1000*samples.reduce((a,b)=>a+b,0)/samples.length,p95Microseconds:1000*samples[Math.floor(samples.length*.95)],p99Microseconds:1000*samples[Math.floor(samples.length*.99)]}));
`;
eval(source);
