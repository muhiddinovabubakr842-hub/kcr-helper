(function(root){
const choose=(ru,tj,language)=>language==='tj'?tj:ru;
function cleanText(value){return String(value||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').split('\n').map(line=>line.replace(/[\t ]+/g,' ').replace(/ +([,.;:!?])/g,'$1').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();}
function inspect(s,language='ru'){
 const t=(ru,tj)=>choose(ru,tj,language),issues=[],notes=[];
 for(const [key,ru,tj] of [['student','ФИО студента','Ному насаби донишҷӯ'],['workTitle','тему работы','мавзӯи кор'],['subject','дисциплину','фан'],['department','кафедру','кафедра'],['group','группу','гурӯҳ']])if(!String(s[key]||'').trim())issues.push(t('Заполни '+ru+'.','Пур кун: '+tj+'.'));
 if(!/^\d{4}$/.test(String(s.year||'')))issues.push(t('Проверь год на титульном листе: нужны четыре цифры.','Соли варақаи унвониро санҷ: чор рақам лозим аст.'));
 const sections=s.sections||[],parts=sections.flatMap(x=>[x,...(x.parts||[])]);
 if(s.includeReport&&!sections.length&&!s.conclusion?.trim()&&!s.sources?.trim())issues.push(t('Основная часть включена, но текст ещё не добавлен.','Қисми асосӣ фаъол аст, аммо матн ҳанӯз нест.'));
 if(s.includeReport&&!s.includeContents)notes.push(t('Содержание отключено. Включи его, если оно требуется преподавателем.','Мундариҷа хомӯш аст. Агар омӯзгор талаб кунад, онро фаъол кун.'));
 if(s.includeReport&&!s.sources?.trim())notes.push(t('Список источников пуст. Добавь только те материалы, которые использовал.','Рӯйхати манбаъҳо холӣ аст. Танҳо манбаъҳои истифодашударо илова кун.'));
 if(s.includeReport&&!s.conclusion?.trim())notes.push(t('Заключение пока пустое. Подведи итог работы, если оно нужно по заданию.','Хулоса ҳанӯз холӣ аст. Агар супориш талаб кунад, натиҷаи корро навис.'));
 const raw=String(s.headerHiddenPages||'').trim();if(raw&&raw.split(/[,;\s]+/).some(token=>!/^\d+(?:[-–]\d+)?$/.test(token)))issues.push(t('В списке скрытых колонтитулов есть неверная запись. Пример: 4, 7, 10-12.','Дар рӯйхати нависҳои пинҳон сабти нодуруст ҳаст. Намуна: 4, 7, 10-12.'));
 const texts=parts.map(p=>p.text||'').concat(s.conclusion||'',s.sources||''),characters=texts.join('').length,images=parts.filter(p=>p.image).length;
 const result=[t('Проверка заполнения','Санҷиши пуркунӣ'),t('Разделов: ','Бахшҳо: ')+sections.length+t(' · Изображений: ',' · Суратҳо: ')+images+t(' · Символов текста: ',' · Аломатҳои матн: ')+characters,''];
 result.push(issues.length?t('Что нужно проверить:','Чиро санҷидан лозим:'):t('Основные поля заполнены.','Майдонҳои асосӣ пур шудаанд.'),...issues.map(x=>'• '+x));
 if(notes.length)result.push('',t('Рекомендации:','Тавсияҳо:'),...notes.map(x=>'• '+x));
 result.push('',t('Это проверка заполнения по правилам сайта. Смысл, факты и требования кафедры проверь сам.','Ин санҷиши пуркунӣ аз рӯйи қоидаҳои сомона аст. Мазмун, далелҳо ва талаботи кафедраро худат санҷ.'));
 return result.join('\n');
}
function outline(s,language='ru'){
 const t=(ru,tj)=>choose(ru,tj,language),lines=[];for(const [i,x]of (s.sections||[]).entries()){if(x.title?.trim())lines.push((s.numberHeadings?i+1+'. ':'')+x.title);let sub=0;for(const p of [{title:x.subtitle},...(x.parts||[])])if(p.title?.trim()){sub++;lines.push('    '+(s.numberHeadings?(i+1)+'.'+sub+'. ':'')+p.title)}}
 if(s.conclusion?.trim())lines.push(t('ЗАКЛЮЧЕНИЕ','ХУЛОСА'));if(s.sources?.trim())lines.push(t('СПИСОК ИСТОЧНИКОВ','РӮЙХАТИ МАНБАЪҲО'));
 return lines.length?t('Структура твоей работы\n\n','Сохтори кори ту\n\n')+lines.join('\n')+'\n\n'+t('Номера страниц появятся в документе автоматически. В Word обнови содержание: Ctrl+A → F9.','Рақамҳои саҳифа дар ҳуҷҷат худкор пайдо мешаванд. Дар Word Ctrl+A → F9-ро пахш кун.'):t('Сначала добавь разделы и подразделы в «Редакторе текста».','Аввал бахшҳо ва зербахшҳоро дар муҳаррир илова кун.');
}
root.PolyLocal={cleanText,inspect,outline};
})(globalThis);
