let pendingWord=null,previousWord=null,previousLocal=null,localAnswerText='',localRequestTarget=null;
const lang=()=>state.language;
function message(text){return tr(text,lang());}
const session=globalThis.PolySession;
$('#accountLabel').textContent=session?session.name:'Локальный режим';
$('#accountLabel').title=session?.email||'Файлы хранятся только в этом браузере';
$('#accountExit').hidden=!session;
document.querySelectorAll('[data-open-import]').forEach(b=>b.onclick=()=>{setView('import');showMobile('editor')});
document.querySelectorAll('[data-start-blank]').forEach(b=>b.onclick=()=>$('#newProject').click());
function showMobile(view){document.body.dataset.mobilePane=view;document.querySelectorAll('[data-mobile-view]').forEach(b=>b.classList.toggle('active',b.dataset.mobileView===view));requestAnimationFrame(fitPaper);}
document.querySelectorAll('[data-mobile-view]').forEach(b=>b.onclick=()=>showMobile(b.dataset.mobileView));
$('[data-mobile-assistant]').onclick=()=>{setView('assistant');showMobile('editor')};
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showMobile('editor')));
for(const el of document.querySelectorAll('[data-typography]'))el.addEventListener('input',()=>{state[el.name]=el.value;renderPreview();save()});
$('#saveBeforeImport').onclick=()=>$('#backup').click();
async function openWord(file){
 if(!file)return;if(!/\.docx$/i.test(file.name)){toast('Выбери файл .docx. Старый .doc сначала сохрани как .docx в Word.');return}
 pendingWord=null;$('#importReview').hidden=true;$('#importStatus').textContent=message('Читаем Word-файл…');$('#wordFile').disabled=true;
 try{pendingWord=await PolyImport.parseDocx(await file.arrayBuffer(),file.name);$('#importName').textContent=pendingWord.filename;$('#importSummary').textContent=message('Разделов')+': '+pendingWord.sections.length+' · '+message('Абзацев')+': '+pendingWord.paragraphCount+' · '+message('Изображений')+': '+pendingWord.imageCount;$('#importExcerpt').textContent=pendingWord.sections.map(s=>s.title+'\n'+s.text).join('\n\n').slice(0,1600);$('#importWarnings').textContent=pendingWord.warnings.join(' ');$('#importStatus').textContent=message('Файл прочитан. Проверь содержимое и открой его в редакторе.');$('#importReview').hidden=false;}catch(e){$('#importStatus').textContent=e.message||message('Не удалось прочитать файл.');}finally{$('#wordFile').disabled=false;$('#wordFile').value='';}
}
$('#wordFile').onchange=e=>openWord(e.target.files[0]);
$('#wordDrop').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('dragging')});
$('#wordDrop').addEventListener('dragleave',e=>e.currentTarget.classList.remove('dragging'));
$('#wordDrop').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('dragging');openWord(e.dataTransfer.files[0])});
$('#applyImport').onclick=()=>{
 if(!pendingWord)return;previousWord=structuredClone(state);
 state=normalize({...state,sections:pendingWord.sections,includeReport:true,conclusion:'',sources:'',headerHiddenPages:'',reportFont:'Times New Roman',reportFontSize:'14',reportLineSpacing:'1.5',reportIndent:'10',workTitle:state.workTitle||pendingWord.filename.replace(/\.docx$/i,'')});
 selected=0;currentPage=0;sampleMode=false;hydrate();setView('report');showMobile('editor');save();$('#undoImport').hidden=false;toast('Word открыт. Текст можно редактировать в разделах и подразделах.');$('#importReview').hidden=true;pendingWord=null;
};
$('#undoImport').onclick=()=>{if(!previousWord)return;state=normalize(previousWord);previousWord=null;selected=0;currentPage=0;hydrate();setView('report');save();$('#undoImport').hidden=true;toast('Предыдущая работа восстановлена.')};
const reference={
 import:['1. Открой «Мой Word».\n2. Выбери .docx до 20 МБ.\n3. Проверь фрагмент и нажми «Оформить и открыть в редакторе».\n4. В «Редакторе текста» выбери раздел и поменяй текст.\n5. Заполни титульник и скачай новый Word. Таблицы при импорте преобразуются в строки текста.','1. «Word-и ман»-ро кушо.\n2. Файли .docx то 20 МБ-ро интихоб кун.\n3. Матнро санҷида, «Ороиш ва кушодан дар муҳаррир»-ро пахш кун.\n4. Дар муҳаррир бахшро интихоб карда, матнро иваз кун.\n5. Варақаи унвониро пур карда, Word-и навро боргирӣ кун.'],
 contents:['1. Включи основную часть и содержание.\n2. Добавь разделы и подразделы со своими названиями.\n3. Содержание соберётся после титульного листа.\n4. При заполнении листа текст перейдёт на следующий автоматически.\n5. В скачанном Word нажми Ctrl+A → F9 для пересчёта номеров содержания.','1. Қисми асосӣ ва мундариҷаро фаъол кун.\n2. Бахшҳо ва зербахшҳоро бо номҳои худ илова кун.\n3. Мундариҷа баъди варақаи унвонӣ сохта мешавад.\n4. Матн худкор ба варақи нав мегузарад.\n5. Дар Word Ctrl+A → F9-ро барои навсозии рақамҳо пахш кун.'],
 headers:['1. Открой «Титульный лист» → «Детали оформления».\n2. Найди «Скрыть верхний и нижний колонтитулы на страницах».\n3. Впиши номера: например, 4, 7, 10-12.\n4. На этих листах исчезнут оба колонтитула и номер.\n5. Чтобы вернуть их, удали номера из поля. На титульнике и содержании они уже скрыты.','1. «Варақаи унвонӣ» → «Ҷузъиёти ороиш»-ро кушо.\n2. Майдони пинҳон кардани болонавис ва поённависро ёб.\n3. Рақамҳоро навис: 4, 7, 10-12.\n4. Дар ин варақҳо ҳар ду навис ва рақам пинҳон мешаванд.\n5. Барои баргардондан рақамҳоро тоза кун.'],
 export:['1. Проверь ФИО, группу, тему и кафедру.\n2. Для редактируемого документа нажми «Скачать Word».\n3. Для PDF открой «Печать / PDF», выбери A4 и масштаб 100%. Отключи колонтитулы браузера.\n4. «Сохранить проект JSON» сохраняет текст, картинки и настройки для продолжения работы здесь.','1. Ному насаб, гурӯҳ, мавзӯъ ва кафедраро санҷ.\n2. Барои ҳуҷҷати таҳриршаванда «Боргирии Word»-ро пахш кун.\n3. Барои PDF чопро кушода A4 ва 100%-ро интихоб кун. Нависҳои браузерро хомӯш кун.\n4. JSON матн, суратҳо ва танзимотро барои идома нигоҳ медорад.']
};
document.querySelectorAll('[data-help-topic]').forEach(b=>b.onclick=()=>{$('#referenceAnswer').textContent=reference[b.dataset.helpTopic][lang()==='tj'?1:0]});
document.querySelectorAll('[data-assistant-tab]').forEach(b=>b.onclick=()=>{const local=b.dataset.assistantTab==='local';$('#referencePanel').hidden=local;$('#localPanel').hidden=!local;document.querySelectorAll('[data-assistant-tab]').forEach(x=>x.classList.toggle('active',x===b))});
$('#useLocalSection').onclick=()=>{const part=state.sections[selected];if(!part){toast('Сначала добавь или выбери раздел.');return}$('#localText').value=part.text||'';toast('Текст выбранного раздела перенесён в помощник.')};
$('#runLocalAssistant').onclick=()=>{
 const mode=$('#localMode').value,target=state.sections[selected];localRequestTarget=null;localAnswerText='';$('#applyLocalText').hidden=true;
 if(mode==='check')$('#localAnswer').textContent=PolyLocal.inspect(state,lang());
 else if(mode==='outline')$('#localAnswer').textContent=PolyLocal.outline(state,lang());
 else{const original=$('#localText').value;if(!original.trim()){toast('Вставь текст или выбери раздел.');return}localAnswerText=PolyLocal.cleanText(original);$('#localAnswer').textContent=localAnswerText;localRequestTarget=target?{id:target.id,original:target.text}:null;$('#applyLocalText').hidden=!localRequestTarget;}
};
$('#applyLocalText').onclick=()=>{if(!localAnswerText||!localRequestTarget)return;const target=state.sections.find(s=>s.id===localRequestTarget.id);if(!target){toast('Раздел уже удалён. Скопируй результат вручную.');return}if(target.text!==localRequestTarget.original&&!confirm(message('Текст раздела изменился. Заменить его очищенным текстом?')))return;previousLocal={id:target.id,text:target.text};target.text=localAnswerText;sectionEditors();renderPreview();save();$('#applyLocalText').hidden=true;$('#undoLocalText').hidden=false;toast('Текст применён. Можно отменить замену.')};
$('#undoLocalText').onclick=()=>{if(!previousLocal)return;const target=state.sections.find(s=>s.id===previousLocal.id);if(target){target.text=previousLocal.text;sectionEditors();renderPreview();save()}previousLocal=null;$('#undoLocalText').hidden=true};
$('#fieldSearch').addEventListener('input',e=>{
 const q=e.target.value.toLocaleLowerCase().trim(),results=$('#fieldResults');results.replaceChildren();if(!q)return;
 const controls=[...document.querySelectorAll('#titleView input,#titleView select,#reportView input,#reportView select,#reportView textarea')].filter(el=>el.type!=='checkbox'&&el.type!=='file');
 const matches=controls.map(el=>({el,label:el.closest('label')?.childNodes[0]?.textContent?.trim()||el.name})).filter(x=>x.label?.toLocaleLowerCase().includes(q)).slice(0,7);
 if(!matches.length){results.textContent=message('Ничего не найдено. Попробуй: кафедра, группа, колонтитул.');return}
 for(const match of matches){const b=document.createElement('button');b.type='button';b.textContent=match.label+' ↗';b.onclick=()=>{setView(match.el.closest('#reportView')?'report':'title');showMobile('editor');const details=match.el.closest('details');if(details)details.open=true;match.el.scrollIntoView({behavior:'smooth',block:'center'});match.el.focus({preventScroll:true});e.target.value='';results.replaceChildren()};results.append(b);}
});

let legacyDraft=null;
(async()=>{if(!session||location.protocol==='file:')return;try{const dbs=indexedDB.databases?await indexedDB.databases():[];if(!dbs.some(d=>d.name==='polytech-documents'))return;const request=indexedDB.open('polytech-documents',1);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('drafts')){db.close();return}const get=db.transaction('drafts').objectStore('drafts').get('current');get.onsuccess=()=>{legacyDraft=get.result;if(legacyDraft)$('#legacyDraftNotice').hidden=false;db.close()};};}catch{}})();
$('#restoreOldDraft').onclick=()=>{if(!legacyDraft)return;if(!confirm(message('Перенести старый черновик? Текущая работа будет заменена.')))return;previousWord=structuredClone(state);state=normalize(legacyDraft);selected=0;sampleMode=false;hydrate();save();$('#legacyDraftNotice').hidden=true;$('#undoImport').hidden=false;toast('Старый черновик перенесён в текущий аккаунт.')};

document.querySelectorAll('a[href="#contacts"]').forEach(a=>a.addEventListener('click',()=>{$('#contacts').scrollIntoView({behavior:'smooth',block:'start'})}));
