/* Portable model v3. No network, storage or DOM dependency. */
(() => {
 'use strict';
 const cats=['roles','skills','tools','standards','languages'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16)};
 const termId=(cat,name)=>cat+'-'+hash(name.normalize('NFC'));
 const emptyRequirements=()=>({degrees:'',degreeEvidence:'',minYears:null,experienceEvidence:'',phd:'unknown',phdEvidence:''});
 const excludedRole=name=>/^(tecnico|disegnatore|fisico|ricercatore)\b/i.test(name.trim());
 const excludedJob=j=>j.requirements?.phd==='required'||/\btechnician\b|mechanical cad designer|detector simulation physicist|fusion materials scientist/i.test(j.title||'')||(j.roles||[]).some(excludedRole);
 function schemaCheck(value,schema,root=schema,path='$'){
  const fail=msg=>{throw Error(path+': '+msg)};
  if(schema.$ref)return schemaCheck(value,root.$defs[schema.$ref.split('/').at(-1)],root,path);
  if(schema.anyOf){for(const candidate of schema.anyOf)try{schemaCheck(value,candidate,root,path);return}catch{}fail('valore non conforme')}
  const types={object:x=>x!==null&&typeof x==='object'&&!Array.isArray(x),array:Array.isArray,string:x=>typeof x==='string',boolean:x=>typeof x==='boolean',integer:Number.isInteger,number:Number.isFinite,null:x=>x===null};
  if(schema.type&&!types[schema.type](value))fail('tipo non valido');
  if(schema.enum&&!schema.enum.includes(value))fail('valore non ammesso');
  if(Object.hasOwn(schema,'const')&&schema.const!==value)fail('costante non valida');
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
   if((schema.required||[]).some(k=>!Object.hasOwn(value,k)))fail('campi obbligatori mancanti');
   for(const [k,v] of Object.entries(value)){const rule=schema.properties&&Object.hasOwn(schema.properties,k)?schema.properties[k]:schema.additionalProperties??true;if(rule===false)fail('campo sconosciuto '+k);if(typeof rule==='object')schemaCheck(v,rule,root,path+'.'+k)}
  }
  if(Array.isArray(value)){if(value.length<(schema.minItems||0)||value.length>(schema.maxItems??Infinity))fail('dimensione lista non valida');if(schema.uniqueItems&&new Set(value.map(v=>JSON.stringify(v))).size!==value.length)fail('elemento duplicato');value.forEach((v,i)=>schemaCheck(v,schema.items||{},root,path+'['+i+']'))}
  if(typeof value==='string'){
   if(value.length<(schema.minLength||0)||value.length>(schema.maxLength??1000000))fail('lunghezza non valida');if(schema.pattern&&!new RegExp(schema.pattern).test(value))fail('formato non valido');
   if(schema.format==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))fail('data non valida');
   if(schema.format==='uri'){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)fail('URL non valido')}catch{fail('URL non valido')}}
  }
  if(typeof value==='number'&&(value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)))fail('numero fuori intervallo');
 }
 function reconcile(p){
  for(const cat of cats)for(const t of p.catalog.categories[cat]){t.id ||= termId(cat,t.name);t.aliases ||= []}
  for(const e of p.entities){
   e.parentId ??= null;e.unitKind ||= 'unspecified';e.customFields ||= [];
   e.sites ||= [{id:e.id+'-reference',name:e.city,country:e.country,city:e.city,lat:e.lat,lon:e.lon,precision:'city',sourceUrl:e.sources[0].url,checked:e.sources[0].checked}];
   e.sectorProfiles ||= {};
   for(const id of Object.keys(e.sectorProfiles))if(!e.sectors.includes(id))delete e.sectorProfiles[id];
   for(const id of e.sectors)if(!e.sectorProfiles[id])e.sectorProfiles[id]={intensity:null,reason:'',sourceUrl:null,checked:null};
  }
  for(const j of p.jobs){
   j.siteId ??= null;j.requirements ||= emptyRequirements();j.revisions ||= [];
   j.termIds=Object.fromEntries(cats.map(cat=>[cat,j[cat].map(name=>p.catalog.categories[cat].find(t=>t.name===name)?.id||'missing')]));
   const before=j.termRequirements||[];
   j.termRequirements=cats.filter(c=>c!=='roles').flatMap(cat=>j[cat].map(name=>{
    const id=p.catalog.categories[cat].find(t=>t.name===name)?.id||'missing',old=before.find(r=>r.category===cat&&r.termId===id);
    return {category:cat,termId:id,importance:old?.importance||'unspecified',evidence:old?.evidence||j.evidence[name]||'',level:old?.level||''};
   }));
  }
  return p;
 }
 function upgrade(input){
  const p=clone(input);if(p.version===2){
   reconcile(p);p.version=3;
   // Existing intensity describes the reference unit, not every secondary sector.
   for(const e of p.entities)e.sectorProfiles[e.sectors[0]]={intensity:e.intensity,reason:e.reason,sourceUrl:e.sources[0].url,checked:e.sources[0].checked};
  }return p;
 }
 function validate(p,bounds){
  const need=(ok,msg)=>{if(!ok)throw Error(msg)},str=x=>typeof x==='string'&&x.length<=4000;
  need(!p.catalog.categories.roles.some(t=>excludedRole(t.name)),'Figura fuori perimetro: usare ruoli ingegneristici o stage universitari, non posti da tecnico o ricercatore.');
  need(!p.jobs.some(excludedJob),'Annuncio fuori perimetro: esclusi posti da tecnico/ricercatore e dottorato obbligatorio.');
  const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x&&x<=new Date().toLocaleDateString('sv-SE');
  const url=x=>{try{const u=new URL(x);return ['http:','https:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password}catch{return false}};
  const ids=new Set(),entities=new Map(p.entities.map(e=>[e.id,e]));
  for(const cat of cats){const aliases=new Set();for(const t of p.catalog.categories[cat]){
   need(typeof t.id==='string'&&/^[a-z0-9-]{1,100}$/.test(t.id)&&!ids.has(t.id),'ID catalogo non valido o duplicato');ids.add(t.id);
   need(Array.isArray(t.aliases)&&t.aliases.every(x=>str(x)&&x.trim()&&x.length<=120),'Sinonimi non validi');
   for(const a of [t.name,...t.aliases]){const n=a.trim().toLocaleLowerCase('it');need(!aliases.has(n),'Nome o sinonimo ambiguo: '+a);aliases.add(n)}
  }}
  for(const e of p.entities){
   need(e.parentId===null||entities.has(e.parentId),'Gruppo / organizzazione collegata inesistente');
   let parent=e;const chain=new Set();while(parent){need(!chain.has(parent.id),'Relazione tra organizzazioni circolare');chain.add(parent.id);parent=entities.get(parent.parentId)}
   need(['unspecified','group','unit','facility'].includes(e.unitKind),'Tipo di unità non valido');
   need(Array.isArray(e.sites)&&e.sites.length>0&&e.sites.length<=100,'Servono da 1 a 100 sedi');const sites=new Set();
   for(const s of e.sites){const b=bounds[s.country];need(str(s.id)&&s.id&&!sites.has(s.id),'ID sede duplicato');sites.add(s.id);need(str(s.name)&&s.name.trim()&&str(s.city)&&s.city.trim()&&b&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&s.lat>=b[0]&&s.lat<=b[1]&&s.lon>=b[2]&&s.lon<=b[3],'Sede o coordinate non valide');need(['city','site'].includes(s.precision)&&url(s.sourceUrl)&&date(s.checked),'Fonte, precisione o data sede non valida')}
   need(e.sectorProfiles&&typeof e.sectorProfiles==='object'&&!Array.isArray(e.sectorProfiles),'Profili di settore mancanti');
   need(Object.keys(e.sectorProfiles).length===e.sectors.length&&e.sectors.every(s=>Object.hasOwn(e.sectorProfiles,s)),'Profili e settori non corrispondenti');
   for(const v of Object.values(e.sectorProfiles))need(v&&str(v.reason)&&(v.intensity===null?v.sourceUrl===null&&v.checked===null:[1,2,3].includes(v.intensity)&&v.reason.trim()&&url(v.sourceUrl)&&date(v.checked)),'Intensità di settore: specificare motivazione, fonte e data');
   need(Array.isArray(e.customFields)&&e.customFields.length<=50,'Campi personalizzati non validi');const fields=new Set();
   for(const f of e.customFields){need(str(f.name)&&f.name.trim()&&!fields.has(f.name.toLowerCase())&&['text','number','date','choice'].includes(f.type),'Campo personalizzato duplicato o non valido');fields.add(f.name.toLowerCase());need(f.type==='number'?Number.isFinite(f.value):str(f.value),'Valore del campo non valido');if(f.type==='date')need(/^\d{4}-\d{2}-\d{2}$/.test(f.value)&&!isNaN(Date.parse(f.value))&&new Date(f.value).toISOString().slice(0,10)===f.value,'Data campo non valida');if(f.type==='choice')need(Array.isArray(f.options)&&f.options.every(str)&&f.options.includes(f.value),'Scelta non compresa nelle opzioni')}
  }
  for(const j of p.jobs){
   need(j.siteId===null||entities.get(j.entity)?.sites.some(s=>s.id===j.siteId&&s.country===j.country),'Sede annuncio inesistente o paese incoerente');
   for(const cat of cats)need(Array.isArray(j.termIds?.[cat])&&JSON.stringify(j.termIds[cat])===JSON.stringify(j[cat].map(n=>p.catalog.categories[cat].find(t=>t.name===n)?.id)),'Riferimenti ID / etichette incoerenti: '+j.title);
   const r=j.requirements;need(r&&['degrees','degreeEvidence','experienceEvidence','phdEvidence'].every(k=>str(r[k]))&&(r.minYears===null||Number.isFinite(r.minYears)&&r.minYears>=0&&r.minYears<=60)&&['unknown','not-required','preferred','required'].includes(r.phd),'Requisiti di ingresso non validi');
   need((!r.degrees.trim()||r.degreeEvidence.trim())&&(r.minYears===null||r.experienceEvidence.trim())&&(r.phd==='unknown'||r.phdEvidence.trim()),'Ogni requisito di ingresso specificato richiede evidenza dalla fonte');
   const seen=new Set();need(Array.isArray(j.termRequirements),'Requisiti competenze mancanti');
   for(const t of j.termRequirements){const key=t.category+':'+t.termId;need(cats.includes(t.category)&&t.category!=='roles'&&j.termIds[t.category].includes(t.termId)&&!seen.has(key)&&['unspecified','required','preferred','alternative'].includes(t.importance)&&str(t.evidence)&&t.evidence.trim()&&str(t.level),'Requisito competenza non valido');seen.add(key)}
   need(seen.size===cats.filter(c=>c!=='roles').reduce((n,c)=>n+j[c].length,0),'Requisiti competenze incompleti');
   need(Array.isArray(j.revisions)&&j.revisions.every(r=>r&&typeof r.at==='string'&&!isNaN(Date.parse(r.at))&&date(r.checked)&&str(r.status)&&r.requirements&&r.termIds&&Array.isArray(r.termRequirements)),'Storico revisioni non valido');
  }return true;
 }
 const intensity=(e,sector)=>sector==='all'?e.intensity:e.sectorProfiles?.[sector]?.intensity??null;
 function revisions(old,next){
  const record=j=>({at:new Date().toISOString(),checked:j.checked,status:j.status,requirements:clone(j.requirements),termIds:clone(j.termIds),termLabels:Object.fromEntries(cats.map(c=>[c,clone(j[c])])),termRequirements:clone(j.termRequirements)});
  next.revisions=clone(old?.revisions||[]);if(old&&!next.revisions.length)next.revisions.push(record(old));
  const current=record(next),last=next.revisions.at(-1),content=({at,...r})=>JSON.stringify(r);
  // Title-only edits do not change the requirements snapshot. Avoid duplicate
  // records even when both timestamps are generated in the same millisecond.
  if(!last||content(last)!==content(current))next.revisions.push(current);return next;
 }
 window.AtlasModel={cats,clone,termId,emptyRequirements,reconcile,upgrade,validate,intensity,revisions,schemaCheck,excludedRole,excludedJob};
})();
