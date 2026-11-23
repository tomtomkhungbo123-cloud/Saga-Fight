import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import worker from '../worker/index.mjs';

test('Fairi video supports media byte ranges and HEAD without returning a body', async () => {
 const path = '/fairi/finisher-clip.mp4';
 const bytes = fs.readFileSync(new URL('../web'+path,import.meta.url));
 globalThis.FILES = {[path]:['video/mp4',bytes.toString('base64')]};
 try {
  const fetchClip = (range,method='GET') => worker.fetch(new Request('https://game.test'+path,{
   method,headers:range?{Range:range}:{}
  }),{});
  const head=await fetchClip(null,'HEAD');
  assert.equal(head.headers.get('Content-Type'),'video/mp4');
  assert.equal(head.headers.get('Content-Length'),String(bytes.length));
  assert.equal(head.headers.get('Accept-Ranges'),'bytes');
  assert.equal(head.body,null);
  for(const [range,start,end] of [['bytes=1-12',1,12],['bytes=-7',bytes.length-7,bytes.length-1],['bytes=13-',13,bytes.length-1]]){
   const result=await fetchClip(range);
   assert.equal(result.status,206);
   assert.equal(result.headers.get('Content-Range'),`bytes ${start}-${end}/${bytes.length}`);
   assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes.subarray(start,end+1));
  }
  assert.equal((await fetchClip('bytes='+bytes.length+'-')).status,416);
 } finally {delete globalThis.FILES;}
});
