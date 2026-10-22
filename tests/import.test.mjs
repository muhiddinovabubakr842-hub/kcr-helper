import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';import vm from 'node:vm';import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),JSZip=require('jszip');
const source=await readFile('web/word-import.js','utf8');
async function importer(){const dom=new JSDOM('',{runScripts:'outside-only',url:'https://example.test'});dom.window.JSZip=JSZip;vm.runInContext(source,dom.getInternalVMContext());return {parse:dom.window.PolyImport.parseDocx,dom};}
async function fixture(body,extras={}){const zip=new JSZip();zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'</w:body></w:document>');for(const [key,value]of Object.entries(extras))zip.file(key,value);return zip.generateAsync({type:'arraybuffer'});}
test('imports Unicode text, headings and table rows into editable sections',async()=>{
 const {parse,dom}=await importer();const bytes=await fixture('<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>1. ВВЕДЕНИЕ</w:t></w:r></w:p><w:p><w:r><w:t>Матни тоҷикӣ &amp; русский текст.</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>1.1. Цель</w:t></w:r></w:p><w:p><w:r><w:t>Создать сайт.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>');
 const result=await parse(bytes,'Моя работа.docx');assert.equal(result.sections.length,1);assert.equal(result.sections[0].title,'ВВЕДЕНИЕ');assert.match(result.sections[0].text,/Матни тоҷикӣ & русский/);assert.equal(result.sections[0].parts[0].title,'Цель');assert.match(result.sections[0].parts[0].text,/A \| B/);assert.equal(result.warnings.length,1);dom.window.close();
});
test('plain DOCX becomes an editable named section and empty/invalid files are rejected',async()=>{
 const {parse,dom}=await importer();const result=await parse(await fixture('<w:p><w:r><w:t>Обычный текст.</w:t></w:r></w:p>'),'Простой.docx');assert.equal(result.sections[0].title,'Простой');assert.equal(result.sections[0].text,'Обычный текст.');
 await assert.rejects(()=>parse(new ArrayBuffer(12)));await assert.rejects(()=>parse(new ArrayBuffer(21*1024*1024)),/20 МБ/);await assert.rejects(()=>parse(fixture('<w:p/>')));dom.window.close();
});
test('embedded PNG is imported without fetching external relationships',async()=>{
 const {parse,dom}=await importer();
 const bytes=await fixture('<w:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:r><w:t>Скриншот</w:t><a:blip r:embed="rId1"/></w:r></w:p>',{'word/_rels/document.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="media/image1.png"/></Relationships>','word/media/image1.png':Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mn8AAAAASUVORK5CYII=','base64')});
 const r=await parse(bytes);assert.equal(r.imageCount,1);assert.match(r.sections[0].image,/^data:image\/png;base64,/);dom.window.close();
});
