(function(root){
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const all=(node,name)=>[...node.getElementsByTagNameNS(W,name)],val=node=>node?.getAttributeNS(W,'val')||'';
function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Этот файл содержит неподдерживаемые XML-объекты.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('Повреждённый документ Word.');return doc;}
async function parseDocx(buffer,filename='Документ.docx'){
 if(buffer.byteLength>20*1024*1024)throw Error('Максимальный размер Word-файла — 20 МБ.');
 const zip=await JSZip.loadAsync(buffer);const names=Object.keys(zip.files);if(names.length>5000)throw Error('В этом файле слишком много вложенных объектов.');
 let expanded=0;for(const f of Object.values(zip.files)){expanded+=f._data?.uncompressedSize||0;if(expanded>80*1024*1024)throw Error('Документ слишком большой после распаковки.');}
 const main=zip.file('word/document.xml');if(!main)throw Error('Выбери Word-файл формата .docx. Старый .doc сначала сохрани как .docx в Word.');
 const doc=xml(await main.async('string')),styles={};
 if(zip.file('word/styles.xml'))for(const s of all(xml(await zip.file('word/styles.xml').async('string')),'style')){const id=s.getAttributeNS(W,'styleId'),name=val(all(s,'name')[0]),outline=val(all(s,'outlineLvl')[0]);styles[id]={name,level:outline!==''?Number(outline)+1:0};}
 const rels={};if(zip.file('word/_rels/document.xml.rels'))for(const r of [...xml(await zip.file('word/_rels/document.xml.rels').async('string')).getElementsByTagName('Relationship')])if(r.getAttribute('TargetMode')!=='External')rels[r.getAttribute('Id')]=r.getAttribute('Target');
 const paragraphs=[],images=[],warnings=[];let count=0;
 const textOf=p=>{let result='';const walker=doc.createTreeWalker(p,NodeFilter.SHOW_ELEMENT);let el;while(el=walker.nextNode()){if(el.namespaceURI!==W)continue;if(el.localName==='t')result+=el.textContent;else if(el.localName==='tab')result+='    ';else if(el.localName==='br')result+='\n';}return result.trim();};
 async function getImages(p){const result=[];for(const blip of [...p.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','blip')]){if(images.length>=60){warnings.push('Перенесены первые 60 изображений.');break}const target=rels[blip.getAttributeNS(R,'embed')];if(!target)continue;const segments=('word/'+target).split('/'),clean=[];for(const part of segments){if(part==='..')clean.pop();else if(part!=='.')clean.push(part)}const path=clean.join('/');if(!path.startsWith('word/media/'))continue;const file=zip.file(path);if(!file||!/.(png|jpe?g|webp)$/i.test(path)){warnings.push('Некоторые изображения имеют неподдерживаемый формат.');continue}const bytes=await file.async('uint8array');if(bytes.byteLength>12*1024*1024)continue;const mime=/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':'image/jpeg';let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));const data='data:'+mime+';base64,'+btoa(encoded);const ext=p.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','extent')[0];const image={image:data,imageWidth:ext?Math.round(Number(ext.getAttribute('cx'))/9525):600,imageHeight:ext?Math.round(Number(ext.getAttribute('cy'))/9525):400};if(mime==='image/webp'){warnings.push('Изображение WebP пропущено: для Word используй PNG или JPEG.');continue}images.push(image);result.push(image);}return result;}
 const body=all(doc,'body')[0];if(!body)throw Error('В файле не найден основной текст.');
 for(const child of [...body.children]){
  if(child.localName==='tbl'){const rows=all(child,'tr').map(row=>[...row.children].filter(c=>c.localName==='tc').map(cell=>all(cell,'p').map(textOf).join(' ')).join(' | '));paragraphs.push({text:rows.join('\n'),level:0,images:[]});warnings.push('Таблицы преобразованы в редактируемый текст строк.');continue;}
  if(child.localName!=='p')continue;if(++count>15000)throw Error('Документ содержит более 15000 абзацев.');
  const styleId=val(all(child,'pStyle')[0]),style=styles[styleId]||{};if(/^(toc|оглавление|содержание)/i.test(styleId+' '+(style.name||'')))continue;
  const outline=val(all(child,'outlineLvl')[0]),match=(styleId+' '+(style.name||'')).match(/(?:heading|заголовок)\s*([1-6])/i);const level=outline!==''?Number(outline)+1:style.level||Number(match?.[1]||0);
  let text=textOf(child);if(all(child,'numPr').length&&text&&!level)text='• '+text;
  const pics=await getImages(child);if(text||pics.length)paragraphs.push({text,level,images:pics});
 }
 const sections=[];let current=null,part=null;
 const makeSection=title=>({title,subtitle:'',text:'',code:'',codeCaption:'',image:'',imageCaption:'',parts:[],newPage:false});
 const append=text=>{if(!current){current=makeSection(filename.replace(/\.docx$/i,''));sections.push(current)}const target=part||current;target.text+=(target.text?'\n\n':'')+text;};
 for(const p of paragraphs){if(p.level===1&&p.text){current=makeSection(p.text.replace(/^\d+[.)]?\s+/,''));sections.push(current);part=null;}
 else if(p.level>=2&&p.text){if(!current)append('');part={title:p.text.replace(/^\d+(?:\.\d+)*[.)]?\s+/,''),text:'',code:'',image:''};current.parts.push(part);}
 else if(p.text)append(p.text);
 for(const image of p.images){if(!current)append('');let target=part||current;if(target.image){target={title:'',text:'',code:'',image:''};current.parts.push(target);part=target}Object.assign(target,image);}
 }
 if(!sections.length)throw Error('В Word-файле нет поддерживаемого текста или изображений.');
 if(sections.length>1000)throw Error('Слишком много разделов. Максимум 1000.');
 return {sections,paragraphCount:paragraphs.length,imageCount:images.length,warnings:[...new Set(warnings)],filename};
}
root.PolyImport={parseDocx};
})(globalThis);
