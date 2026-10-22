import {readdir,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',png:'image/png',txt:'text/plain; charset=utf-8',svg:'image/svg+xml'};
const assets={};
for(const file of await readdir('web')){const data=await readFile('web/'+file);assets['/'+file]={body:data.toString('base64'),type:mime[file.split('.').pop()]||'application/octet-stream'};}
const source=(await readFile('worker/index.js','utf8')).replace('/*__ASSET_MAP__*/{}',JSON.stringify(assets));
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Worker and '+Object.keys(assets).length+' bundled assets.');
