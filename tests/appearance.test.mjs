import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile('web/appearance.js','utf8');
test('arbitrary colors apply across light, dark and gray with readable button labels and links',()=>{
 const dom=new JSDOM('<input data-color-picker type="color"><input data-color-hex>',{url:'https://example.test',runScripts:'outside-only'});vm.runInContext(source,dom.getInternalVMContext());const api=dom.window.PolyAppearance;
 for(const theme of ['light','dark','gray'])for(const color of ['#FFFFFF','#000000','#FFEE00','#FF00FF','#16A34A','#081122']){api.setTheme(theme);assert(api.setColor(color));const p=api.palette(theme,color);assert.equal(p['--brand'],color);assert(api.contrast(p['--brand'],p['--brand-ink'])>=4.5);assert(api.contrast(p['--accent'],p['--surface'])>=4.5);assert.equal(dom.window.localStorage.getItem('pd-accent'),color);}
 const before=api.color;assert.equal(api.setColor('url(evil)'),false);assert.equal(api.color,before);dom.window.close();
});
test('picker controls persist colors and reset both theme and color',()=>{
 const dom=new JSDOM('<input data-theme-value type="radio" value="dark"><input data-color-picker type="color"><input data-color-hex><button data-reset-colors></button>',{url:'https://example.test',runScripts:'outside-only'});vm.runInContext(source,dom.getInternalVMContext());dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const {document:d,PolyAppearance:api}=dom.window;const picker=d.querySelector('[data-color-picker]');picker.value='#ff8800';picker.dispatchEvent(new dom.window.Event('input'));assert.equal(api.color,'#FF8800');const radio=d.querySelector('[data-theme-value]');radio.checked=true;radio.dispatchEvent(new dom.window.Event('change'));assert.equal(api.theme,'dark');d.querySelector('[data-reset-colors]').click();assert.equal(api.theme,'light');assert.equal(api.color,'#18776D');dom.window.close();
});
