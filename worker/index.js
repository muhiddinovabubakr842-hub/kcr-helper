const ASSETS=/*__ASSET_MAP__*/{};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function userFrom(request){const userId=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');if(!userId||!email)return null;let name=request.headers.get('oai-authenticated-user-full-name')||email;if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')try{name=decodeURIComponent(name)}catch{}return {userId,email,name};}
function asset(path,session=null){const file=ASSETS[path];if(!file)return new Response('Not found',{status:404});let bytes=Uint8Array.from(atob(file.body),c=>c.charCodeAt(0));if(path==='/index.html'&&session){let html=new TextDecoder().decode(bytes);html=html.replace('<!--SESSION-->',`<script>globalThis.PolySession=${JSON.stringify(session).replace(/</g,'\\u003c')}</script>`);bytes=new TextEncoder().encode(html);}return new Response(bytes,{headers:{'Content-Type':file.type,'Cache-Control':file.type.startsWith('text/html')?'private, no-store':'public, max-age=300','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"} });}
export async function handle(request,env={}){
 const url=new URL(request.url),user=userFrom(request);
 if(url.pathname==='/api/session')return json({user});
 if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 if(url.pathname==='/'||url.pathname==='/index.html')return asset(user?'/index.html':'/guest.html',user);
 if(url.pathname==='/editor'){if(!user)return Response.redirect(url.origin+'/signin-with-chatgpt?return_to=%2Feditor',302);return asset('/index.html',user);}
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
 if(['/app.js','/workbench.js','/word-import.js'].includes(url.pathname)&&!user)return new Response('Sign in required',{status:401});
 return asset(url.pathname);
}
export default {fetch:handle};
