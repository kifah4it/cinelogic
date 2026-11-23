import assert from 'node:assert/strict';
import worker from '../worker.mjs';
const bytes = new Uint8Array(1000).map((_,i) => i % 256);
const env = {ASSETS:{fetch: async request => {
  assert.equal(request.headers.get('Range'), null);
  return new Response(request.method === 'HEAD' ? null : bytes, {headers:{'Content-Type':'video/mp4','Content-Length':'1000',ETag:'"film-v1"'}});
}}};
async function check(range, status, expected, contentRange, extra = {}, method = 'GET') {
  const headers = {...extra}; if (range) headers.Range = range;
  const response = await worker.fetch(new Request('https://cinelogic.net/assets/videos/film.mp4',{method,headers}),env);
  assert.equal(response.status,status,range);
  assert.equal(response.headers.get('Accept-Ranges'),'bytes');
  assert.equal(response.headers.get('Content-Range'),contentRange);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),expected);
}
await check('bytes=0-1',206,bytes.slice(0,2),'bytes 0-1/1000');
await check('bytes=500-',206,bytes.slice(500),'bytes 500-999/1000');
await check('bytes=-20',206,bytes.slice(980),'bytes 980-999/1000');
await check('bytes=990-2000',206,bytes.slice(990),'bytes 990-999/1000');
for(const range of ['bytes=1000-','bytes=5-2','bytes=-0']) await check(range,416,new Uint8Array(), 'bytes */1000');
for(const range of [null,'bad','bytes=','bytes=0-1,5-6']) await check(range,200,bytes,null);
await check('bytes=0-1',200,bytes,null,{'If-Range':'"old-film"'});
await check('bytes=0-1',206,bytes.slice(0,2),'bytes 0-1/1000',{'If-Range':'"film-v1"'});
await check('bytes=0-1',200,new Uint8Array(),null,{},'HEAD');
console.log('PASS video byte ranges: exact bytes, open/suffix/clamped ranges, 416, malformed/multiple ranges, If-Range and HEAD.');
