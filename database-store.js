/* Local, portable data store. Import only JSON; never execute imported content. */
(() => {
 'use strict';
 const D=window.ATLAS,M=window.AtlasModel, key='nuclear-atlas-public-database-v1';
 const bounds={AT:[46,49.2,9.4,17.2],BE:[49.4,51.6,2.4,6.5],BG:[41.1,44.3,22.3,28.7],CH:[45.8,47.9,5.9,10.6],CY:[34.4,35.8,32.1,34.7],CZ:[48.5,51.1,12,18.9],DE:[47.2,55.1,5.8,15.1],DK:[54.5,57.9,8,15.3],EE:[57.5,59.9,21.7,28.3],ES:[27.5,43.9,-18.3,4.4],FI:[59.6,70.2,19,31.7],FR:[41.3,51.2,-5.2,9.7],GR:[34.7,41.8,19.2,29.8],HR:[42.2,46.6,13.3,19.5],HU:[45.7,48.7,16,23],IE:[51.3,55.5,-10.8,-5.9],IT:[35.4,47.2,6.5,18.6],LT:[53.8,56.5,20.8,26.9],LU:[49.4,50.2,5.7,6.6],LV:[55.6,58.2,20.8,28.3],MT:[35.7,36.2,14.1,14.7],NL:[50.7,53.7,3.2,7.3],PL:[49,55,14,24.2],PT:[30,42.3,-31.5,-6.1],RO:[43.6,48.3,20.2,29.8],SE:[55.2,69.2,10.9,24.3],SI:[45.4,46.9,13.3,16.7],SK:[47.7,49.7,16.8,22.6],UK:[49.8,60.9,-8.7,2],NO:[57.8,71.3,4.3,31.3]};
 const types=['developer','supplier','research','coordinator'],levels=['intern','junior','experienced','unspecified'];
 Object.assign(D,M.upgrade({version:D.entities.every(e=>e.sites)&&D.catalog.categories.roles.every(t=>t.id)?3:2,entities:D.entities,jobs:D.jobs,catalog:D.catalog}));
 const clone=x=>JSON.parse(JSON.stringify(x)),defaults=clone(D.catalog),categories=['roles','skills','tools','standards','languages'];
 const safeName=x=>text(x)&&x===x.trim()&&x.length<=120&&!['__proto__','constructor','prototype'].includes(x.toLowerCase())&&!/[\r\n=]/.test(x);
 function validateCatalog(c){
  if(!c||!Array.isArray(c.sectors)||!c.sectors.length||c.sectors.length>100||!c.categories)throw Error('Catalogo non valido: servono settori e categorie.');
  const ids=new Set(),labels=new Set();
  for(const s of c.sectors){
   if(!s||!/^[-a-z0-9]{1,80}$/.test(s.id)||['all','__proto__','constructor','prototype'].includes(s.id)||ids.has(s.id)||!safeName(s.label)||labels.has(s.label.toLocaleLowerCase('it'))||!/^#[0-9a-f]{6}$/i.test(s.color)||!['circle','square','diamond','cross','triangle'].includes(s.shape)||typeof s.description!=='string'||s.description.length>2000)throw Error('Settore non valido o duplicato. Usa un nome unico, un colore e un simbolo validi.');
   ids.add(s.id);labels.add(s.label.toLocaleLowerCase('it'));
  }
  for(const cat of categories){
   const terms=c.categories[cat],names=new Set();
   if(!Array.isArray(terms)||terms.length>1000)throw Error('Catalogo incompleto o troppo grande: '+cat);
   for(const t of terms){if(!t||!safeName(t.name)||names.has(t.name.toLocaleLowerCase('it'))||typeof t.description!=='string'||t.description.length>2000)throw Error('Nome voce non valido o duplicato in '+cat);names.add(t.name.toLocaleLowerCase('it'))}
  }
  return true;
 }
 function prepare(payload){
  const p=clone(payload);
  if(p?.version===1){
   // Old exports contain only records. Use baseline classifications, never the current customized catalog.
   p.catalog=clone(defaults);p.version=2;
   for(const j of p.jobs||[])for(const name of j.roles||[])if(!p.catalog.categories.roles.some(t=>t.name===name))p.catalog.categories.roles.push({name,description:''});
  }
  return translateTerms(M.upgrade(p));
 }
 // Rename only unchanged built-in terms. User-defined names and IDs stay intact.
 function translateTerms(p){
  if(!p?.catalog?.categories||!Array.isArray(p.jobs))return p;
  const changes={};
  for(const cat of ['roles','skills']){
   const terms=p.catalog.categories[cat];if(!Array.isArray(terms))continue;
   for(const rename of D.meta.englishTermRenames?.[cat]||[]){
    const term=terms.find(t=>t.id===rename.id&&t.name===rename.old);
    if(!term||terms.some(t=>t!==term&&[t.name,...(t.aliases||[])].some(n=>n.toLowerCase()===rename.name.toLowerCase())))continue;
    term.name=rename.name;term.aliases=[...new Set([...(term.aliases||[]),rename.old].filter(n=>n.toLowerCase()!==rename.name.toLowerCase()))];
    changes[rename.old]=rename.name;
   }
  }
  const update=j=>{
   for(const cat of ['roles','skills'])if(Array.isArray(j[cat]))j[cat]=j[cat].map(n=>changes[n]||n);
   if(j.evidence)j.evidence=Object.fromEntries(Object.entries(j.evidence).map(([k,v])=>[changes[k]||k,v]));
   // Revision snapshots use the same vocabulary, without changing their evidence.
   for(const value of Object.values(j))if(value&&typeof value==='object'&&!Array.isArray(value)&&value!==j.evidence)update(value);
   if(Array.isArray(j.revisions))j.revisions.forEach(update);
  };
  p.jobs.forEach(update);return p;
 }
 const isURL=u=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)&&!!x.hostname&&!x.username&&!x.password}catch{return false}};
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
 const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<4000;
 const list=x=>Array.isArray(x)&&x.every(text)&&new Set(x).size===x.length;
 function validate(payload){
  payload=prepare(payload);
  if(!payload||payload.version!==3||!Array.isArray(payload.entities)||!Array.isArray(payload.jobs))throw Error('Formato non valido: servono entities, jobs e catalogo (versione 3; importazione versioni 1 e 2 supportata).');
  validateCatalog(payload.catalog);const sectors=payload.catalog.sectors.map(s=>s.id);
  M.schemaCheck(payload,window.ATLAS_SCHEMA);
  if(payload.entities.length>3000||payload.jobs.length>15000)throw Error('Archivio oltre il limite locale (3.000 realtà / 15.000 annunci).');
  const ids=new Set(),names=new Set(),urls=new Set(),jobIds=new Set();
  for(const e of payload.entities){
   if(D.meta.archivedEntityIds?.includes(e?.id))throw Error('Realtà archiviata dopo revisione del perimetro: '+e.name);
   if(!e||!text(e.id)||!/^[-a-z0-9]+$/.test(e.id)||ids.has(e.id))throw Error('ID realtà mancante, non valido o duplicato.');ids.add(e.id);
   if(!['name','city','summary','reason'].every(k=>text(e[k])))throw Error('Campi descrittivi mancanti per '+e.id);
   const name=e.name.trim().toLowerCase();if(names.has(name))throw Error('Nome realtà duplicato: '+e.name);names.add(name);
   const b=bounds[e.country];if(!b||!Number.isFinite(e.lat)||!Number.isFinite(e.lon)||e.lat<b[0]||e.lat>b[1]||e.lon<b[2]||e.lon>b[3])throw Error('Coordinate incompatibili con il paese: '+e.name);
   if(!types.includes(e.type)||![1,2,3].includes(e.intensity)||!list(e.sectors)||!e.sectors.length||e.sectors.some(s=>!sectors.includes(s))||!list(e.projects))throw Error('Classificazione non valida: '+e.name);
   if(typeof e.verified!=='boolean'||e.outside!==['UK','NO'].includes(e.country))throw Error('Perimetro o stato di verifica non valido: '+e.name);
   if(!Array.isArray(e.sources)||!e.sources.length||e.sources.some(s=>!isURL(s.url)||!date(s.checked)||s.checked>new Date().toLocaleDateString('sv-SE')))throw Error('Fonte o data mancante/futura: '+e.name);
   if(['website','careers','education'].some(k=>e[k]!==null&&e[k]!==undefined&&!isURL(e[k])))throw Error('URL non valido: '+e.name);
   if(e.engineeringDomains!==undefined&&!list(e.engineeringDomains))throw Error('Ambiti ingegneristici non validi: '+e.name);
   for(const k of ['engineeringFit','application'])if(e[k]!==undefined&&!text(e[k]))throw Error('Classificazione ingegneristica incompleta: '+e.name);
  }
  for(const j of payload.jobs){
   if(D.taxonomy.excludedJobIds?.includes(j?.id))throw Error('Annuncio escluso dopo revisione dei requisiti: '+j.title);
   if(!j||!text(j.id)||jobIds.has(j.id)||!ids.has(j.entity))throw Error('Annuncio senza realtà associata o ID duplicato.');jobIds.add(j.id);
   if(!text(j.title)||!isURL(j.url)||!date(j.checked)||!text(j.status)||!bounds[j.country]||!sectors.includes(j.sector)||!levels.includes(j.level))throw Error('Campi annuncio incompleti: '+(j.title||j.id));
   const url=j.url.replace(/\/$/,'');if(urls.has(url))throw Error('URL annuncio duplicato: '+j.title);urls.add(url);
   if(!list(j.roles)||!j.roles.length||!['core','adjacent'].includes(j.focus)||j.mechanical!==(j.focus==='core')||!text(j.focusReason)||j.outside!==['UK','NO'].includes(j.country))throw Error('Figura o pertinenza incompleta: '+j.title);
   if(j.roles.some(v=>!payload.catalog.categories.roles.some(t=>t.name===v)))throw Error('Figura professionale assente dal catalogo: '+j.title);
   if(!j.evidence||typeof j.evidence!=='object'||Array.isArray(j.evidence))throw Error('Evidenze non valide: '+j.title);
   for(const cat of ['skills','tools','standards','languages']){
    if(!list(j[cat])||j[cat].some(v=>!payload.catalog.categories[cat].some(t=>t.name===v)||!Object.hasOwn(j.evidence||{},v)||!text(j.evidence[v])))throw Error('Catalogo o evidenza mancante in '+cat+': '+j.title);
   }
   for(const k of ['published','deadline'])if(j[k]!==null&&j[k]!==undefined&&!date(j[k]))throw Error('Data '+k+' non valida: '+j.title);
   if(!Array.isArray(j.observations)||!j.observations.length||j.observations.some(o=>!date(o.checked)||!text(o.status)))throw Error('Osservazioni mancanti: '+j.title);
   if(j.checked!==j.observations.map(o=>o.checked).sort().at(-1)||j.checked>new Date().toLocaleDateString('sv-SE'))throw Error('Ultima verifica incoerente o futura: '+j.title);
   if(!payload.entities.find(e=>e.id===j.entity).sectors.includes(j.sector))throw Error('Settore non documentato nella realtà associata: '+j.title);
   if(/full.stack|devops|web engineer|it support|linux infrastructure/i.test(j.title))throw Error('Ruolo IT generico fuori dal perimetro meccanico: '+j.title);
  }
  M.validate(payload,bounds);
  return true;
 }
 let seenStorage=null;
 let status='Dataset di partenza. Nessuna modifica locale.';
 const baseline=new Map(D.entities.map(e=>[e.id,e]));
 let jobMigrationNote='';
 function mergeJobBatches(p){
  const batches=D.meta.jobBatches||[];
  if(!D.meta.jobRevision||p.jobRevision===D.meta.jobRevision)return;
  const previous=batches.findIndex(b=>b.revision===p.jobRevision);
  const pending=batches.slice(previous+1),added=new Set(pending.flatMap(b=>b.addedIds)),updated=new Set(pending.flatMap(b=>b.updatedIds));
  // A collection batch may document a new sector for an existing employer.
  // Refresh only its untouched record; never resurrect deleted employers or
  // overwrite a personalized employer, or reintroduce a removed sector.
  const employerUpdates=new Set(pending.flatMap(b=>b.updatedEntityIds||[]));
  const availableSectors=new Set(p.catalog.sectors.map(s=>s.id));
  // Only first introduced employers from pending batches are eligible. This
  // does not restore employers deleted after a batch was already installed.
  for(const id of new Set(pending.flatMap(b=>b.addedEntityIds||[]))){
   const current=baseline.get(id);
   if(current&&!p.entities.some(e=>e.id===id)&&current.sectors.every(s=>availableSectors.has(s)))p.entities.push(clone(current));
  }
  p.entities=p.entities.map(e=>{
   const current=baseline.get(e.id);
   return employerUpdates.has(e.id)&&!e.locallyEdited&&current&&current.sectors.every(s=>availableSectors.has(s))?clone(current):e;
  });
  const employers=new Map(p.entities.map(e=>[e.id,e])),sectors=new Set(p.catalog.sectors.map(s=>s.id));
  let skipped=0;
  for(const source of D.jobs){
   const index=p.jobs.findIndex(j=>j.id===source.id),local=p.jobs[index];
   // Deleted older jobs stay deleted; edited jobs remain the user's version.
   if(index<0&&!added.has(source.id)||index>=0&&!updated.has(source.id)&&!added.has(source.id)||local?.locallyEdited)continue;
   if(!employers.get(source.entity)?.sectors.includes(source.sector)||!sectors.has(source.sector)){skipped++;continue}
   const incoming=clone(source),ids=new Map(),evidence={};
   for(const cat of categories){
    incoming[cat]=source[cat].map(name=>{
     const term=D.catalog.categories[cat].find(t=>t.name===name);
     let target=p.catalog.categories[cat].find(t=>t.id===term.id);
     target ||= p.catalog.categories[cat].find(t=>[t.name,...t.aliases].some(n=>n.toLocaleLowerCase('it')===term.name.toLocaleLowerCase('it')));
     if(!target){target=clone(term);target.aliases=target.aliases.filter(a=>!p.catalog.categories[cat].some(t=>[t.name,...t.aliases].some(n=>n.toLocaleLowerCase('it')===a.toLocaleLowerCase('it'))));p.catalog.categories[cat].push(target)}
     ids.set(term.id,target.id);if(source.evidence[name])evidence[target.name]=source.evidence[name];return target.name;
    });
   }
   incoming.evidence=evidence;
   incoming.termRequirements=incoming.termRequirements.map(r=>({...r,termId:ids.get(r.termId)||r.termId}));
   if(index<0)p.jobs.push(incoming);else p.jobs[index]=incoming;
  }
  M.reconcile(p);p.jobRevision=D.meta.jobRevision;
  jobMigrationNote=skipped?` ${skipped} annunci non inseriti perché realtà o settori sono stati rimossi/personalizzati.`:'';
 }
 function migrate(payload){
  const p=prepare(payload);
  if(!Array.isArray(p.entities)||!Array.isArray(p.jobs))return p;
  if(p.employerRevision!==D.meta.employerRevision){
   p.entities=p.entities.filter(e=>e.type!=='university'&&!D.meta.archivedEntityIds.includes(e.id)).map(e=>{
    const current=baseline.get(e.id);if(!current)return e;
    // Preserve user edits. Refresh untouched baseline entries and fill only new fields on edited ones.
    return e.locallyEdited?{application:current.application,engineeringFit:current.engineeringFit,engineeringDomains:current.engineeringDomains,...e}:JSON.parse(JSON.stringify(current));
   });
   const ids=new Set(p.entities.map(e=>e.id));
   for(const id of D.meta.addedEntityIds)if(!ids.has(id))p.entities.push(JSON.parse(JSON.stringify(baseline.get(id))));
   const kept=new Set(p.entities.map(e=>e.id));
   p.jobs=p.jobs.filter(j=>kept.has(j.entity)&&!['phd','postdoc'].includes(j.level));
   p.employerRevision=D.meta.employerRevision;
  }
  if(p.editorialRevision!==D.meta.editorialRevision){
   const sectorLabels={accelerators:['Infrastrutture scientifiche','Infrastrutture'],healthcare:['Medicina nucleare e sanità','Healthcare']};
   for(const s of p.catalog.sectors){const names=sectorLabels[s.id];if(names&&s.label===names[0])s.label=names[1]}
   const renames=D.meta.roleRenames||{};
   for(const t of p.catalog.categories.roles)if(renames[t.name])t.name=renames[t.name];
   for(const j of p.jobs)j.roles=j.roles.map(n=>renames[n]||n);
   p.jobs=p.jobs.filter(j=>!D.taxonomy.excludedJobIds?.includes(j.id)&&!M.excludedJob(j));
   const used=new Set(p.jobs.flatMap(j=>j.roles));
   p.catalog.categories.roles=p.catalog.categories.roles.filter(t=>!M.excludedRole(t.name)&&(t.name!=='Specialista di laboratorio materiali'||used.has(t.name)));
   const updated=D.jobs.find(j=>j.id==='cern-10c5025cbab9');
   p.jobs=p.jobs.map(j=>updated&&j.id===updated.id&&!j.locallyEdited?clone(updated):j);
   M.reconcile(p);p.editorialRevision=D.meta.editorialRevision;
  }
  p.jobs=p.jobs.filter(j=>!D.taxonomy.excludedJobIds?.includes(j.id));
  mergeJobBatches(p);
  return p;
 }
 try{const saved=localStorage.getItem(key);seenStorage=saved;if(saved){const original=JSON.parse(saved),p=migrate(original);validate(p);
  if(JSON.stringify(p)!==JSON.stringify(original)){
   // Preserve the exact previous copy before applying a scope migration.
   const revision=original.jobRevision!==D.meta.jobRevision&&D.meta.jobRevision?D.meta.jobRevision:original.editorialRevision!==D.meta.editorialRevision?D.meta.editorialRevision:D.meta.employerRevision;
   const backupKey=key+'-before-'+(original.version===1?'catalog-v2':original.version===2?'platform-v3':revision);
   if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,saved);
   localStorage.setItem(key,JSON.stringify(p));seenStorage=JSON.stringify(p);
   status='Copia aggiornata con i dati verificati. Modifiche personali conservate; copia precedente esportabile.'+jobMigrationNote;
  }else status='Copia locale caricata. Esporta per conservarla e condividerla.';
  D.entities=p.entities;D.jobs=p.jobs;D.catalog=p.catalog;
 }}
 catch(e){status='Copia locale non caricata: '+e.message+' Il dataset di partenza è disponibile.'}
 function snapshot(){return clone({version:3,employerRevision:D.meta.employerRevision,editorialRevision:D.meta.editorialRevision,jobRevision:D.meta.jobRevision,snapshotDate:D.date,exportedAt:new Date().toISOString(),entities:D.entities,jobs:D.jobs,catalog:D.catalog})}
 let history=[];try{history=JSON.parse(localStorage.getItem(key+'-history')||'[]');if(!Array.isArray(history))history=[]}catch{}
 function commit(payload){
  const p=M.reconcile(prepare(payload));validate(p);const serialized=JSON.stringify(p),previous=snapshot();let durable=true,current;
  try{current=localStorage.getItem(key)}catch{}
  if(current!==undefined&&current!==seenStorage)throw Error('La copia è cambiata in un’altra scheda. Esporta le modifiche e ricarica prima di salvare.');
  const next=[{at:new Date().toISOString(),data:previous},...history].slice(0,5);
  try{localStorage.setItem(key+'-history',JSON.stringify(next));localStorage.setItem(key,serialized);seenStorage=serialized}catch{durable=false}
  history=next;D.entities=p.entities;D.jobs=p.jobs;D.catalog=p.catalog;
  status=durable?'Modifiche salvate. Ultime 5 versioni recuperabili da Backup e ripristino. Esporta per una copia indipendente.':'Memoria persistente non disponibile: modifiche solo in questa sessione. Esporta ora il JSON.';return durable;
 }
 function undoLast(){if(!history.length)return false;const remaining=history.slice(1),p=history[0].data;commit(p);history=remaining;try{localStorage.setItem(key+'-history',JSON.stringify(history))}catch{}return true}
 window.addEventListener('storage',e=>{if(e.key===key&&e.newValue!==seenStorage){status='Database modificato in un’altra scheda. Esporta eventuali modifiche e ricarica prima di salvare.';const el=document.getElementById('db-status');if(el)el.textContent=status}});
 window.AtlasStore={validate,validateCatalog,prepare,commit,snapshot,isURL,date,bounds,migrate,undoLast,canUndo:()=>history.length>0,getBackups:()=>clone(history),restoreBackup:i=>{if(!history[i])throw Error("Backup assente");return commit(history[i].data)},getPrevious:()=>{try{return localStorage.getItem(key+'-before-'+D.meta.jobRevision)||localStorage.getItem(key+'-before-'+D.meta.employerRevision)||localStorage.getItem(key+'-before-'+D.meta.editorialRevision)||localStorage.getItem(key+'-before-platform-v3')||localStorage.getItem(key+'-before-catalog-v2')}catch{return null}},getStatus:()=>status};
})();
