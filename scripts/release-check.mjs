import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function releaseInfo(){
 const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
 const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'web/game.js'),'utf8');
 const online=fs.readFileSync(path.join(root,'web/online.js'),'utf8');
 const thunder=fs.readFileSync(path.join(root,'web/thunder/model.js'),'utf8');
 const frontend=html.match(/BUILD (\d+\.\d+\.\d+)/)?.[1];
 const gameBuild=game.match(/SagaGameBuild=['"]([^'"]+)/)?.[1];
 if(frontend!==version||gameBuild!==version)throw Error(`Release không đồng bộ: package=${version}, web/index.html=${frontend}, web/game.js=${gameBuild}. Cần cập nhật toàn bộ thư mục web/ trong cùng commit.`);
 for(const match of html.matchAll(/<script[^>]+src="([^"?]+)/g))if(!fs.existsSync(path.join(root,'web',match[1])))throw Error('Thiếu asset web/'+match[1]);
 const hash=value=>createHash('sha256').update(value).digest('hex');
 return {version,frontendBuild:frontend,gameBuild,gameSha256:hash(game),networkBuild:online.match(/NET_BUILD=['"]([^'"]+)/)?.[1]||null,simulation:online.match(/SIMULATION=['"]([^'"]+)/)?.[1]||null,onlineSha256:hash(online),thunderModelSha256:hash(thunder)};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(releaseInfo()));
