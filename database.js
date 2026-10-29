(() => {
 'use strict';
 const D=window.ATLAS,S=window.AtlasStore,U=window.AtlasUI,$=s=>document.querySelector(s),esc=U.esc;
 let page=0;
 const today=()=>new Date().toLocaleDateString('sv-SE');
 const options=(values,current)=>Object.entries(values).map(([k,v])=>`<option value="${esc(k)}" ${k===current?'selected':''}>${esc(v)}</option>`).join('');
 const download=(name,value,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([value],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
 function render(){
  const jobIndex=new Map();for(const j of D.jobs){if(!jobIndex.has(j.entity))jobIndex.set(j.entity,[]);jobIndex.get(j.entity).push(j)}
  for(const [id,values,names] of [['db-type',Object.keys(U.typeNames),U.typeNames],['db-application',[...new Set(D.entities.map(e=>e.application).filter(Boolean))],{}]]){const select=$('#'+id),old=select.value;select.innerHTML='<option value="all">Tutti</option>'+options(Object.fromEntries(values.map(v=>[v,names[v]||v])),old);select.value=[...select.options].some(o=>o.value===old)?old:'all'}
  const nameOrder=(a,b)=>a.name.localeCompare(b.name,'it',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id);
  const lastCheck=e=>e.sources.map(s=>s.checked).sort().at(-1)||'';
  const order=$('#db-sort').value;
  const compare=(a,b)=>{
   let value=0;
   if(order==='name-desc')return -nameOrder(a,b);
   if(order.startsWith('jobs-'))value=((jobIndex.get(a.id)||[]).length-(jobIndex.get(b.id)||[]).length)*(order==='jobs-desc'?-1:1);
   if(order==='country')value=(U.countryNames[a.country]||a.country).localeCompare(U.countryNames[b.country]||b.country,'it');
   if(order.startsWith('verified-'))value=lastCheck(a).localeCompare(lastCheck(b))*(order==='verified-desc'?-1:1);
   return value||nameOrder(a,b);
  };
  const q=$('#db-search').value.toLocaleLowerCase('it'),sector=$('#db-sector').value,has=$('#db-has-jobs').value;
  const rows=D.entities.filter(e=>(!q||[e.name,e.city,e.summary,...e.projects,...(e.engineeringDomains||[]),e.engineeringFit||''].join(' ').toLocaleLowerCase('it').includes(q))&&(sector==='all'||e.sectors.includes(sector))).filter(e=>($('#db-type').value==='all'||e.type===$('#db-type').value)&&($('#db-application').value==='all'||e.application===$('#db-application').value)).filter(e=>has==='all'||(jobIndex.has(e.id)?has==='yes':has==='no')).sort(compare);
  $('#db-count').textContent=`${rows.length} realtà`;
  $('#db-status').textContent=S.getStatus();$('#db-undo').disabled=!S.canUndo();
  $('#db-previous').hidden=!S.getPrevious();
  const size=Number($('#db-page-size').value);page=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));$('#db-page-label').textContent=`Pagina ${page+1} di ${Math.max(1,Math.ceil(rows.length/size))}`;$('#db-prev-page').disabled=page===0;$('#db-next-page').disabled=(page+1)*size>=rows.length;
  $('#db-rows').innerHTML=rows.slice(page*size,(page+1)*size).map(e=>`<tr><td><button class="text-button db-name" data-entity="${esc(e.id)}">${esc(e.name)}</button><small>${esc(e.city)} · ${esc(U.countryNames[e.country])}${e.outside?' · fuori perimetro':''}</small></td><td>${e.sectors.map(s=>esc(U.sectorNames[s])).join(' / ')}<small>${esc(e.application||'Da classificare')} · ${e.intensity}/3</small></td><td>${(e.engineeringDomains||[]).map(esc).join(' · ')||'Da documentare'}</td><td>${esc(lastCheck(e))}<small>${e.verified?'Documentata':'Non verificata'}</small></td><td><button class="button small light" data-db-history="${esc(e.id)}">${(jobIndex.get(e.id)||[]).length} annunci →</button></td><td><button class="text-button" data-db-edit="${esc(e.id)}">Modifica</button></td></tr>`).join('')||'<tr><td colspan="6">Nessun risultato.</td></tr>';
 }
 function finish(payload){S.commit(payload);U.refresh();window.dispatchEvent(new Event('atlas-data-changed'));$('#detail').close();U.announce(S.getStatus())}
 function field(label,name,value='',type='text',required=true){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value??'')}" ${required?'required':''} ${type==='number'?'step="any"':''}></label>`}
 function area(label,name,value='',required=true){return `<label class="full">${label}<textarea name="${name}" rows="3" ${required?'required':''}>${esc(value??'')}</textarea></label>`}
 function editEntity(id){
  const old=D.entities.find(e=>e.id===id),e=old||{id:'local-'+crypto.randomUUID(),name:'',country:'IT',city:'',sectors:[D.catalog.sectors[0].id],type:'developer',intensity:3,projects:[],sources:[{url:'',checked:today()}]};
  U.showDialog(`<p class="eyebrow">DATABASE · ${old?'MODIFICA':'NUOVA REALTÀ'}</p><h2>${old?esc(e.name):'Aggiungi una realtà'}</h2><form id="entity-form" class="editor-form">
   ${window.AtlasPlatform?.entityFields(e)||''}${field('Nome','name',e.name)}${field('Città / sede di riferimento','city',e.city)}
   <label>Paese<select name="country">${options(U.countryNames,e.country)}</select></label><label>Tipo<select name="type">${options(U.typeNames,e.type)}</select></label>
   <label>Settore principale<select name="primary">${options(U.sectorNames,e.sectors[0])}</select></label><label>Intensità<select name="intensity">${options({1:'1 · Abilitante',2:'2 · Specialista',3:'3 · Nucleo'},String(e.intensity))}</select></label>
   <fieldset class="full"><legend>Altri settori documentati</legend>${Object.entries(U.sectorNames).map(([k,v])=>`<label class="check"><input name="sectors" value="${k}" type="checkbox" ${e.sectors.includes(k)?'checked':''}>${esc(v)}</label>`).join('')}</fieldset>
   ${field('Latitudine (stima della sede)','lat',e.lat,'number')}${field('Longitudine (stima della sede)','lon',e.lon,'number')}
   ${area('Cosa fa, in sintesi','summary',e.summary)}${field('Applicazione / segmento','application',e.application)}${area('Pertinenza ingegneristica (giudizio motivato dalle fonti)','engineeringFit',e.engineeringFit)}${area('Ambiti ingegneristici suggeriti (uno per riga, non requisiti di annunci)','engineeringDomains',(e.engineeringDomains||[]).join('\n'))}${area('Motivazione dell’intensità','reason',e.reason)}${area('Progetti / attività (uno per riga)','projects',e.projects.join('\n'))}
   ${area('Fonti: URL | data YYYY-MM-DD (una per riga)','sources',e.sources.map(s=>s.url+' | '+s.checked).join('\n'))}
   ${field('Sito istituzionale','website',e.website,'url',false)}${field('Careers','careers',e.careers,'url',false)}${field('Tesi / studenti','education',e.education,'url',false)}
   ${area('Connessione con una tesi (ipotesi da concordare)','thesis',e.thesis,false)}
   <label class="check full"><input type="checkbox" name="verified" ${e.verified?'checked':''}>Ho verificato identità e attività nelle fonti indicate.</label>
   <p class="muted full">Solo dati istituzionali: niente nomi personali, contatti o testi integrali di annunci. La disponibilità di tesi non va dedotta da una pagina generica.</p>
   <p id="form-error" class="form-error full" role="alert"></p><button class="button" type="submit">Salva nel database locale</button></form>`);
  $('#entity-form').onsubmit=ev=>{ev.preventDefault();try{const f=new FormData(ev.target),v=k=>String(f.get(k)||'').trim(),primary=v('primary');
   const sources=v('sources').split('\n').filter(x=>x.trim()).map(line=>{const [url,checked]=line.split('|').map(x=>x.trim());return {url,checked,status:'Verifica dichiarata dall’utente'}});
   const updated={...e,name:v('name'),city:v('city'),country:v('country'),type:v('type'),sectors:[primary,...f.getAll('sectors').filter(x=>x!==primary)],intensity:Number(v('intensity')),lat:Number(v('lat')),lon:Number(v('lon')),summary:v('summary'),application:v('application'),engineeringFit:v('engineeringFit'),engineeringDomains:v('engineeringDomains').split('\n').map(x=>x.trim()).filter(Boolean),reason:v('reason'),projects:v('projects').split('\n').map(x=>x.trim()).filter(Boolean),sources,website:v('website')||null,careers:v('careers')||null,education:v('education')||null,thesis:v('thesis'),verified:f.has('verified'),outside:['UK','NO'].includes(v('country')),coordinateStatus:'stima città/sede',locallyEdited:true};
   window.AtlasPlatform?.readEntity(updated,ev.target);const p=S.snapshot();p.entities=old?p.entities.map(x=>x.id===id?updated:x):[...p.entities,updated];finish(p)
  }catch(e){$('#form-error').textContent=e.message}};
 }
 function history(id){const e=D.entities.find(x=>x.id===id);if(!e)return;const jobs=D.jobs.filter(j=>j.entity===id).sort((a,b)=>b.checked.localeCompare(a.checked)||a.title.localeCompare(b.title));
  U.showDialog(`<p class="eyebrow">ARCHIVIO ANNUNCI · ${esc(e.name)}</p><h2>${jobs.length} annunci registrati</h2><p class="muted">Date di osservazione separate dalla pubblicazione. L’assenza di annunci significa assenza nel nostro campione, non assenza di opportunità.</p><button class="button small" data-db-add-job="${esc(id)}">+ Aggiungi annuncio pertinente</button><div class="history-list">${jobs.map(j=>`<article><button class="text-button db-name" data-job="${esc(j.id)}">${esc(j.title)}</button><p>${esc(j.roles.join(' / '))} · ${esc(j.country)}${j.outside?' · fuori perimetro':''}</p><p>Pubblicazione: ${esc(j.published||'non disponibile')} · Ultima verifica: ${esc(j.checked)}</p><details><summary>${j.observations.length} osservazioni</summary><ul>${j.observations.map(o=>`<li>${esc(o.checked)} · ${esc(o.status)}</li>`).join('')}</ul></details><button class="text-button" data-db-edit-job="${esc(j.id)}">Modifica / registra una nuova verifica</button></article>`).join('')||'<p>Nessun annuncio raccolto per questa realtà. Usa la pagina careers per cercare proposte pertinenti.</p>'}</div>`);
 }
 function editJob(entity,id){
  const old=D.jobs.find(x=>x.id===id),e=D.entities.find(x=>x.id===(old?.entity||entity));if(!e)return;
  const draftCatalog=S.snapshot().catalog;
  const j=old||{id:'local-'+crypto.randomUUID(),entity:e.id,title:'',roles:[],country:e.country,sector:e.sectors[0],focus:'core',level:'unspecified',skills:[],tools:[],standards:[],languages:[],evidence:{},checked:today(),status:'Osservato; disponibilità da verificare',observations:[]};
  U.showDialog(`<p class="eyebrow">ANNUNCIO · ${esc(e.name)}</p><h2>${old?'Aggiorna annuncio':'Aggiungi annuncio pertinente'}</h2><p class="muted">Inserisci ruoli di meccanica o discipline di confine motivate. Sono esclusi sviluppo web, IT generico e funzioni senza un collegamento tecnico concreto.</p><form id="job-form" class="editor-form">
   ${window.AtlasPlatform?.jobFields(j,e)||''}${field('Titolo originale','title',j.title)}${area('Figure professionali normalizzate (una per riga)','role',j.roles.join('\n'))}<label class="full">Aggiungi una figura dal catalogo<select id="job-role-picker"><option value="">Scegli una figura…</option>${draftCatalog.categories.roles.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}</select></label><p class="muted full">Puoi modificare le figure nel campo sopra; i nuovi nomi saranno aggiunti al catalogo al salvataggio.</p>
   <label>Paese della posizione<select name="country">${options(U.countryNames,j.country)}</select></label><label>Settore<select name="sector">${options(U.sectorNames,j.sector)}</select></label>
   <label>Livello<select name="level">${options(U.levelNames,j.level)}</select></label><label>Pertinenza<select name="focus">${options({core:'Meccanica diretta',adjacent:'Disciplina di confine'},j.focus)}</select></label>
   ${area('Perché è pertinente al percorso meccanico','focusReason',j.focusReason)}${field('URL ufficiale dell’annuncio','url',j.url,'url')}
   ${field('Data di questa verifica','checked',j.checked,'date')}${field('Pubblicazione (se esplicita)','published',j.published,'date',false)}${field('Scadenza (se esplicita)','deadline',j.deadline,'date',false)}${field('Stato osservato','status',j.status)}
   ${['skills','tools','standards','languages'].map((cat,i)=>`<fieldset class="full"><legend>${['Competenze tecniche','Tool / software','Norme / codici','Lingue esplicitamente menzionate'][i]}</legend><div class="checkbox-grid">${draftCatalog.categories[cat].map(term=>{const label=term.name;return `<label class="check"><input type="checkbox" name="${cat}" value="${esc(label)}" ${j[cat].includes(label)?'checked':''}>${esc(label)}</label>`}).join('')}</div><div class="inline-term"><label>Nuova voce<input data-new-term="${cat}" maxlength="120" placeholder="Nome della voce"></label><label>Evidenza dalla fonte<input data-new-evidence="${cat}" placeholder="Breve frammento esplicito"></label><button type="button" class="button small light" data-add-term="${cat}">Aggiungi e seleziona</button></div></fieldset>`).join('')}
   ${window.AtlasPlatform?.termFields(j)||''}${area('Evidenze: nome voce = breve frammento della fonte (una per riga, per ogni voce selezionata)','evidence',Object.entries(j.evidence).map(([k,v])=>k+' = '+v).join('\n'),false)}
   <p class="muted full">Non selezionare una competenza solo perché plausibile. Servono menzioni esplicite; i testi completi restano sulla fonte.</p><p id="form-error" role="alert" class="form-error full"></p><button class="button" type="submit">Salva annuncio e osservazione</button></form>`);
  $('#job-role-picker').onchange=ev=>{if(!ev.target.value)return;const field=$('#job-form [name="role"]');field.value=[...new Set([...field.value.split('\n').map(x=>x.trim()).filter(Boolean),ev.target.value])].join('\n');ev.target.value=''};
  $('#job-form').addEventListener('click',ev=>{const button=ev.target.closest('[data-add-term]');if(!button)return;try{
   const cat=button.dataset.addTerm,field=$(`[data-new-term="${cat}"]`),input=$(`[data-new-evidence="${cat}"]`),name=field.value.trim(),fragment=input.value.trim();
   if(!fragment)throw Error('Inserisci un breve frammento della fonte per la nuova voce.');
   const existing=draftCatalog.categories[cat].find(t=>t.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it'));
   if(existing)throw Error('Questa voce è già nel catalogo: selezionala nella lista.');
   const trial=JSON.parse(JSON.stringify(draftCatalog));trial.categories[cat].push({name,description:''});S.validateCatalog(trial);draftCatalog.categories[cat]=trial.categories[cat];
   const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.name=cat;check.value=name;check.checked=true;label.append(check,document.createTextNode(name));button.closest('fieldset').querySelector('.checkbox-grid').append(label);check.dispatchEvent(new Event('change',{bubbles:true}));
   const evidence=$('#job-form [name="evidence"]');evidence.value+=(evidence.value?'\n':'')+name+' = '+fragment;field.value='';input.value='';$('#form-error').textContent='';
  }catch(e){$('#form-error').textContent=e.message}});
  $('#job-form').onsubmit=ev=>{ev.preventDefault();try{const f=new FormData(ev.target),v=k=>String(f.get(k)||'').trim(),evidence=Object.create(null);
   for(const line of v('evidence').split('\n').filter(x=>x.trim())){const at=line.indexOf('=');if(at<1)throw Error('Formato evidenze: nome voce = frammento');evidence[line.slice(0,at).trim()]=line.slice(at+1).trim()}
   const observations=[...j.observations.filter(o=>o.checked!==v('checked')),{checked:v('checked'),status:v('status')}].sort((a,b)=>a.checked.localeCompare(b.checked));
   const updated={...j,title:v('title'),roles:[...new Set(v('role').split('\n').map(x=>x.trim()).filter(Boolean))],country:v('country'),sector:v('sector'),level:v('level'),focus:v('focus'),focusReason:v('focusReason'),mechanical:v('focus')==='core',outside:['UK','NO'].includes(v('country')),url:v('url'),checked:v('checked'),published:v('published')||null,deadline:v('deadline')||null,status:v('status'),evidence,observations,levelEvidence:'Classificazione manuale dichiarata dall’utente; requisiti sulla fonte.',analysis:'manual-v2',locallyEdited:true};
   for(const cat of ['skills','tools','standards','languages'])updated[cat]=f.getAll(cat);
   const p=S.snapshot();p.catalog=draftCatalog;for(const name of updated.roles)if(!p.catalog.categories.roles.some(t=>t.name===name))p.catalog.categories.roles.push({name,description:''});window.AtlasPlatform?.readJob(updated,ev.target,j,p.catalog);p.jobs=old?p.jobs.map(x=>x.id===id?updated:x):[...p.jobs,updated];finish(p)
  }catch(e){$('#form-error').textContent=e.message}};
 }
 document.addEventListener('click',ev=>{for(const [attr,fn] of [['data-db-edit',editEntity],['data-db-history',history],['data-db-add-job',id=>editJob(id)],['data-db-edit-job',id=>editJob(null,id)]]){const b=ev.target.closest('['+attr+']');if(b){fn(b.getAttribute(attr));break}}});
 window.addEventListener('atlas-data-changed',render);
 $('#db-undo').onclick=()=>{if(S.undoLast()){U.refresh();window.dispatchEvent(new Event('atlas-data-changed'));U.announce('Ultima modifica annullata.')}};
 $('#db-add').onclick=()=>editEntity();$('#db-search').oninput=()=>{page=0;render()};['db-sector','db-has-jobs','db-type','db-application','db-sort'].forEach(id=>$('#'+id).onchange=()=>{page=0;render()});
 $('#db-previous').onclick=()=>{const previous=S.getPrevious();if(previous)download('nuclear-atlas-before-employer-review.json',previous,'application/json')};
 $('#db-export').onclick=()=>download('nuclear-atlas-database.json',JSON.stringify(S.snapshot(),null,2),'application/json');
 $('#db-import').onchange=async ev=>{try{const file=ev.target.files[0];if(!file)return;if(file.size>20000000)throw Error('File troppo grande (limite 20 MB).');const p=S.prepare(JSON.parse(await file.text()));S.validate(p);window.AtlasPlatform.previewImport(p)}catch(e){$('#db-status').textContent='Importazione non eseguita: '+e.message}finally{ev.target.value=''}};
 $('#db-prev-page').onclick=()=>{page--;render()};$('#db-next-page').onclick=()=>{page++;render()};$('#db-page-size').onchange=()=>{page=0;render()};
 window.AtlasDatabase={render,editEntity,editJob,finish,history};

 render();
})();
