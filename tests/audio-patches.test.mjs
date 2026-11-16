import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
test('V2 patch merge preserves every unrelated entry and WAV; all 26 patch checksums match',()=>{
 const current=JSON.parse(fs.readFileSync('web/sfx/manifest.json')),baseline=JSON.parse(fs.readFileSync('tests/fixtures/audio-before-v2.json')),before=baseline.manifest;
 const changed=new Set();for(const dir of fs.readdirSync('docs/sfx-v2'))for(const cue of JSON.parse(fs.readFileSync('docs/sfx-v2/'+dir+'/manifest.json')).sounds){changed.add(cue.id);const actual=current.sounds.find(c=>c.id===cue.id);assert.deepEqual(actual,{...before.sounds.find(c=>c.id===cue.id),...cue});assert.equal(crypto.createHash('sha256').update(fs.readFileSync('web/sfx/'+cue.file)).digest('hex'),cue.sha256);}
 assert.equal(changed.size,26);assert.equal(current.sounds.length,56);for(const cue of before.sounds)if(!changed.has(cue.id)){assert.deepEqual(current.sounds.find(c=>c.id===cue.id),cue);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('web/sfx/'+cue.file)).digest('hex'),baseline.sha256[cue.file]);}
});
