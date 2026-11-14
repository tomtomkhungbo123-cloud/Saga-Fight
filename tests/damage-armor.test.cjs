const fs=require('fs');let src=fs.readFileSync(require('node:path').join(__dirname,'mox.test.cjs'),'utf8').split('function mox()')[0].replaceAll('__dirname',JSON.stringify(__dirname));
src+=`for(const [type,keys] of [['thunder',['e','r']],['soul',['r']],['cylast',['w','r']],['mox',['r']]])for(const k of keys)for(const form of (type==='mox'?[0,1]:[0])){
 reset(type);run("fighters[1].x=840;fighters.forEach(f=>f.y=floor(f.x));"+(form?"request(fighters[0],'q');":"")+"request(fighters[0],'"+k+"')");
 assert.equal(run('damageArmor(fighters[0])'),true,type+' '+k+' '+form);
 const use=run('fighters[0].combat.activeUse.id');
 run('damage(fighters[1],fighters[0],100,120)');
 assert.equal(run('fighters[0].hp'),900);assert.equal(run('fighters[0].hitstunUntil'),0);assert.equal(run('fighters[0].knockVx'),0);assert.equal(run('fighters[0].combat.activeUse.id'),use);
 assert.equal(run("fighters[0].mox?.action?.k||fighters[0].action?.k"),k);
 advance(.01);assert.equal(run('isStunned(fighters[0])'),false);
 advance(4);assert.equal(run('damageArmor(fighters[0])'),false);
 }
 reset('thunder');run("request(fighters[0],'q');damage(fighters[1],fighters[0],100)");assert.equal(run('fighters[0].action'),null);
 console.log('PASS damage armor whitelist all requested skills/both forms: HP retained damage, no flinch/push, active use retained, expiry, unlisted skill still interrupted');`;
eval(src);
