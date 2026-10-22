/* Independent panels and paper transforms. Document data and exports never use these coordinates. */
(function(root){
const $=s=>document.querySelector(s),area=$('.editor-layout'),viewport=$('.sheet-viewport'),paper=$('#paper'),layer=$('.paper-pan-layer');
if(!area||!viewport||!paper||!layer)return;
const MM=96/25.4,W=210*MM,H=297*MM,clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const panels={form:$('.editor-panel'),preview:$('.preview-panel')},layoutKey='pd-panel-layout-v1';
const previewDialog=$('#previewDialog'),openPreview=$('#openPreview'),closePreview=$('#closePreview');
let fullView=null,dialogAnchor=null;
let requestedFree=true,free=false,positions={},drag=null,front=5,zoom=.6,panX=0,panY=0,autoFit=true,hand=true;
const pointers=new Map();let sheetDrag=null,pinch=null;
try{const saved=JSON.parse(localStorage.getItem(layoutKey));if(saved){requestedFree=saved.free!==false;positions=saved.panels||{}}}catch{}
function box(){return {w:area.clientWidth||900,h:area.clientHeight||800};}
function isDesktop(){return (root.matchMedia?.('(min-width: 1101px)').matches??false)&&area.clientWidth>=740;}
function persist(){try{localStorage.setItem(layoutKey,JSON.stringify({free:requestedFree,panels:positions}))}catch{}}
function normalizePanel(key,p){const b=box(),minW=key==='form'?330:360;const width=clamp(Number(p?.w)||400,Math.min(minW,b.w),b.w),height=clamp(Number(p?.h)||740,360,b.h);return {x:clamp(Number(p?.x)||0,0,b.w-width),y:clamp(Number(p?.y)||0,0,b.h-height),w:width,h:height};}
function defaults(){const b=box(),left=clamp(b.w*.42,330,440);return {form:{x:0,y:0,w:left,h:b.h},preview:{x:left+20,y:0,w:b.w-left-20,h:b.h}};}
function applyPanels(){free=requestedFree&&isDesktop();area.classList.toggle('free-panels',free);const initial=defaults();for(const [key,panel]of Object.entries(panels)){if(fullView&&key==='preview')continue;if(free){positions[key]=normalizePanel(key,positions[key]||initial[key]);const p=positions[key];panel.style.left=p.x+'px';panel.style.top=p.y+'px';panel.style.width=p.w+'px';panel.style.height=p.h+'px';}else{for(const k of ['left','top','width','height','zIndex'])panel.style[k]='';}}
 $('#togglePanels').setAttribute('aria-pressed',String(requestedFree));$('#togglePanels').classList.toggle('active',requestedFree);refreshSheet();}
function changePanel(key,patch){if(!panels[key]||(fullView&&key==='preview'))return;positions[key]=normalizePanel(key,{...positions[key],...patch});const p=positions[key];if(free){Object.assign(panels[key].style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});refreshSheet()}return {...p};}
function panelStart(event,key,resize=false){if(!free||fullView||event.button!==0)return;event.preventDefault();const el=event.currentTarget;try{el.setPointerCapture(event.pointerId)}catch{}panels[key].style.zIndex=String(++front);drag={id:event.pointerId,key,resize,x:event.clientX,y:event.clientY,start:{...positions[key]}};el.classList.add('is-dragging');}
for(const el of document.querySelectorAll('[data-panel-drag],[data-panel-resize]')){
 const key=el.dataset.panelDrag||el.dataset.panelResize,resize=!!el.dataset.panelResize;
 el.addEventListener('pointerdown',event=>panelStart(event,key,resize));
 el.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId||drag.key!==key)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y,p=drag.start;changePanel(key,resize?{w:p.w+dx,h:p.h+dy}:{x:p.x+dx,y:p.y+dy})});
 const end=event=>{if(drag?.id===event.pointerId){drag=null;el.classList.remove('is-dragging');persist()}};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 el.addEventListener('keydown',event=>{if(!free||fullView)return;const d=event.shiftKey?40:10,p=positions[key];if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const dx=event.key==='ArrowRight'?d:event.key==='ArrowLeft'?-d:0,dy=event.key==='ArrowDown'?d:event.key==='ArrowUp'?-d:0;changePanel(key,resize?{w:p.w+dx,h:p.h+dy}:{x:p.x+dx,y:p.y+dy});persist();});
}
$('#togglePanels').onclick=()=>{requestedFree=!requestedFree;applyPanels();persist()};
$('#resetPanels').onclick=()=>{positions={};applyPanels();persist()};
function dimensions(){return {w:viewport.clientWidth||500,h:viewport.clientHeight||600};}
function drawSheet(){paper.style.transform='scale('+zoom+')';layer.style.transform='translate('+panX+'px,'+panY+'px)';layer.style.width=W*zoom+'px';layer.style.height=Math.max(H,paper.scrollHeight||H)*zoom+'px';$('.paper-wrap').style.width=W+'px';$('.paper-wrap').style.height=Math.max(H,paper.scrollHeight||H)*zoom+'px';$('#sheetZoom').value=Math.round(zoom*100);viewport.classList.toggle('hand-mode',hand);$('#panSheet').setAttribute('aria-pressed',String(hand));}
function fitSheet(){const d=dimensions();zoom=clamp(Math.min((d.w-40)/W,(d.h-40)/H),.25,2);panX=(d.w-W*zoom)/2;panY=Math.max(20,(d.h-H*zoom)/2);autoFit=true;drawSheet();}
function refreshSheet(){if(autoFit)fitSheet();else drawSheet();}
function zoomAt(next,x,y){const d=dimensions();x=Number.isFinite(x)?x:d.w/2;y=Number.isFinite(y)?y:d.h/2;const worldX=(x-panX)/zoom,worldY=(y-panY)/zoom;zoom=clamp(next,.25,2);panX=x-worldX*zoom;panY=y-worldY*zoom;autoFit=false;drawSheet();}
function panBy(dx,dy){panX+=dx;panY+=dy;autoFit=false;drawSheet();}
function clearGesture(){for(const id of pointers.keys()){try{viewport.releasePointerCapture(id)}catch{}}pointers.clear();sheetDrag=null;pinch=null;drag=null;viewport.classList.remove('is-panning');}
function openFullPreview(){
 if(fullView||!previewDialog)return;
 fullView={zoom,panX,panY,autoFit,hand,focus:document.activeElement,inert:[]};clearGesture();
 dialogAnchor=document.createComment('preview-panel');panels.preview.before(dialogAnchor);previewDialog.append(panels.preview);
 const toast=$('#toast');if(toast){fullView.toastAnchor=document.createComment('preview-toast');toast.before(fullView.toastAnchor);previewDialog.append(toast);}
 panels.preview.classList.add('fullscreen-preview');document.body.classList.add('preview-expanded');openPreview.hidden=true;closePreview.hidden=false;
 try{if(typeof previewDialog.showModal==='function')previewDialog.showModal();else previewDialog.setAttribute('open','');}
 catch{previewDialog.setAttribute('open','');}
 for(const el of document.body.children){if(el===previewDialog||['SCRIPT','STYLE'].includes(el.tagName))continue;fullView.inert.push([el,el.inert]);el.inert=true;}
 fitSheet();closePreview.focus();
}
function closeFullPreview(){
 if(!fullView)return;const saved=fullView;fullView=null;clearGesture();
 if(typeof previewDialog.close==='function'&&previewDialog.open)previewDialog.close();else previewDialog.removeAttribute('open');
 dialogAnchor.replaceWith(panels.preview);dialogAnchor=null;panels.preview.classList.remove('fullscreen-preview');document.body.classList.remove('preview-expanded');openPreview.hidden=false;closePreview.hidden=true;
 if(saved.toastAnchor)saved.toastAnchor.replaceWith($('#toast'));
 for(const [el,inert]of saved.inert)el.inert=inert;
 zoom=saved.zoom;panX=saved.panX;panY=saved.panY;autoFit=saved.autoFit;hand=saved.hand;applyPanels();
 if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
}
if(previewDialog&&openPreview&&closePreview){
 openPreview.onclick=openFullPreview;closePreview.onclick=closeFullPreview;
 previewDialog.addEventListener('cancel',event=>{event.preventDefault();closeFullPreview()});
 previewDialog.addEventListener('close',()=>{if(!previewDialog.open)closeFullPreview()});
 previewDialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeFullPreview();return;}
  if(event.key!=='Tab')return;
  const controls=[...previewDialog.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&!el.closest('[hidden]')&&!el.matches('[data-panel-drag],[data-panel-resize]'));
  const first=controls[0],last=controls.at(-1);if(!first)return;
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
}
$('#zoomIn').onclick=()=>zoomAt(zoom+.1);$('#zoomOut').onclick=()=>zoomAt(zoom-.1);$('#sheetZoom').onchange=event=>{const n=Number(event.target.value);if(Number.isFinite(n))zoomAt(n/100);else drawSheet()};
$('#fitSheet').onclick=fitSheet;$('#actualSize').onclick=()=>zoomAt(1);
$('#panSheet').onclick=()=>{hand=!hand;drawSheet()};
function point(event){const rect=viewport.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
function pinchState(){const [a,b]=[...pointers.values()];const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};return {distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),mid,zoom,worldX:(mid.x-panX)/zoom,worldY:(mid.y-panY)/zoom};}
viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button!==0||!hand)return;event.preventDefault();try{viewport.setPointerCapture(event.pointerId)}catch{}const p=point(event);pointers.set(event.pointerId,p);if(pointers.size===1)sheetDrag={x:p.x,y:p.y,panX,panY};else if(pointers.size===2){pinch=pinchState();sheetDrag=null}viewport.classList.add('is-panning');});
viewport.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;const p=point(event);pointers.set(event.pointerId,p);autoFit=false;if(pointers.size>=2&&pinch){const now=pinchState();zoom=clamp(pinch.zoom*now.distance/pinch.distance,.25,2);panX=now.mid.x-pinch.worldX*zoom;panY=now.mid.y-pinch.worldY*zoom;}else if(sheetDrag){panX=sheetDrag.panX+p.x-sheetDrag.x;panY=sheetDrag.panY+p.y-sheetDrag.y;}drawSheet();});
function endSheet(event){pointers.delete(event.pointerId);pinch=null;if(pointers.size===1){const p=[...pointers.values()][0];sheetDrag={...p,panX,panY};}else{sheetDrag=null;viewport.classList.remove('is-panning');}}
viewport.addEventListener('pointerup',endSheet);viewport.addEventListener('pointercancel',endSheet);
viewport.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();const p=point(event);zoomAt(zoom*Math.exp(-event.deltaY*.002),p.x,p.y)}},{passive:false});
viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;if(event.key==='0'){event.preventDefault();fitSheet();return}if(['+','=','-'].includes(event.key)){event.preventDefault();zoomAt(zoom+(event.key==='-'?-.1:.1));return}const delta=event.shiftKey?50:15,map={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};if(map[event.key]){event.preventDefault();panBy(...map[event.key])}});
new ResizeObserver(()=>applyPanels()).observe(area);new ResizeObserver(()=>refreshSheet()).observe(viewport);
root.PolyWorkspace={refreshSheet,fitSheet,zoomAt,panBy,changePanel,applyPanels,openFullPreview,closeFullPreview,get state(){return {free,zoom,panX,panY,fullscreen:!!fullView,panels:structuredClone(positions)}}};applyPanels();
})(globalThis);
