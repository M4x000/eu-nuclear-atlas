/* Editable classification catalog. Labels are data, never executable patterns. */
(() => {
 'use strict';
 const D=window.ATLAS,S=window.AtlasStore,U=window.AtlasUI,$=s=>document.querySelector(s),esc=U.esc;
 const labels={sectors:'Settori',roles:'Figure professionali',skills:'Competenze',tools:'Tool e software',standards:'Norme e codici',languages:'Lingue'};
 const shapes={circle:'● Cerchio',square:'■ Quadrato',diamond:'◆ Rombo',cross:'✚ Croce',triangle:'▲ Triangolo'};
 let category='sectors';
 const list=()=>category==='sectors'?D.catalog.sectors:D.catalog.categories[category];
 function usage(cat,id,p=S.snapshot()){
  const entities=cat==='sectors'?p.entities.filter(e=>e.sectors.includes(id)).length:0;
  const jobs=p.jobs.filter(j=>cat==='sectors'?j.sector===id:j[cat].includes(id)).length;
  return {entities,jobs,total:entities+jobs};
 }
 function renameTerm(p,cat,old,term){
  const entry=p.catalog.categories[cat].find(t=>t.name===old);
  if(!entry)throw Error('Voce non trovata.');
  p.catalog.categories[cat]=p.catalog.categories[cat].map(t=>t===entry?term:t);
  for(const j of p.jobs){
   if(!j[cat].includes(old))continue;
   j[cat]=[...new Set(j[cat].map(n=>n===old?term.name:n))];
   if(cat!=='roles'&&term.name!==old){
    j.evidence[term.name]=[...new Set([j.evidence[term.name],j.evidence[old]].filter(Boolean))].join(' | ');
    if(!['skills','tools','standards','languages'].some(k=>j[k].includes(old)))delete j.evidence[old];
   }
   // Relabeling is manual curation, not a new source observation.
   if(term.name!==old){j.analysis='manual-v2';j.locallyEdited=true}
  }
 }
 function saved(p){S.commit(p);U.refresh();window.dispatchEvent(new Event('atlas-data-changed'));$('#detail').close();U.announce('Catalogo aggiornato. Filtri e dati collegati sono allineati.')}
 function render(){
  $('#catalog-tabs').innerHTML=Object.entries(labels).map(([k,v])=>`<button class="sector ${k===category?'active':''}" data-catalog-category="${k}">${v}</button>`).join('');
  $('#catalog-add').textContent=category==='sectors'?'+ Nuovo settore':'+ Nuova voce';
  const snapshot=S.snapshot();
  const q=$('#catalog-search').value.trim().toLocaleLowerCase('it');
  const rows=list().filter(t=>[t.label||t.name,t.description].join(' ').toLocaleLowerCase('it').includes(q));
  $('#catalog-count').textContent=`${rows.length} voci · ${labels[category]}`;
  $('#catalog-rows').innerHTML=rows.map(t=>{
   const id=category==='sectors'?t.id:t.name,n=usage(category,id,snapshot);
   return `<article class="catalog-row"><div><b>${category==='sectors'?`<span style="color:${t.color}">${shapes[t.shape].split(' ')[0]}</span> `:''}${esc(t.label||t.name)}</b><p>${esc(t.description||'Descrizione non inserita.')}</p><small>${category==='sectors'?`${n.entities} realtà · `:''}${n.jobs} annunci</small></div><button class="button small light" data-catalog-edit="${esc(id)}">Modifica</button></article>`;
  }).join('')||'<p class="empty">Nessuna voce trovata.</p>';
 }
 function edit(id){
  const sector=category==='sectors',old=list().find(t=>(sector?t.id:t.name)===id),t=old||{label:'',name:'',description:'',color:'#426ab5',shape:'circle'},used=old?usage(category,id):{entities:0,jobs:0,total:0};
  const cat=category;
  U.showDialog(`<p class="eyebrow">PERSONALIZZA · ${labels[cat]}</p><h2>${old?'Modifica':'Aggiungi'} ${sector?'settore':'voce'}</h2><form id="catalog-form" class="editor-form">
   <label class="full">Nome<input name="label" required maxlength="120" value="${esc(t.label||t.name)}"></label>
   <label class="full">Descrizione / significato<textarea name="description" maxlength="2000" rows="3">${esc(t.description)}</textarea></label>
   ${sector?`<label>Colore sulla mappa<input name="color" type="color" value="${t.color}"></label><label>Simbolo sulla mappa<select name="shape">${Object.entries(shapes).map(([k,n])=>`<option value="${k}" ${k===t.shape?'selected':''}>${n}</option>`).join('')}</select></label>`:''}
   <p class="notice full">${sector?'Nome, colore e simbolo si aggiornano in mappa, filtri e schede; le associazioni restano intatte.':`La rinomina aggiorna questa voce in ${used.jobs} annunci e nei ranking, conservando le evidenze e le date di osservazione. Aggiungere una voce non la attribuisce automaticamente agli annunci.`}</p>
   <p id="catalog-error" class="form-error full" role="alert"></p><div class="full db-actions"><button class="button" type="submit">Salva ${sector?'settore':'voce'}</button>${old?`<button class="button light" type="button" id="catalog-delete" ${used.total||sector&&D.catalog.sectors.length===1?'disabled':''}>Elimina voce inutilizzata</button>`:''}</div>
   ${old&&used.total?'<p class="muted full">Voce utilizzata: per eliminarla, modifica prima le associazioni nelle realtà o negli annunci. La rinomina è sempre disponibile.</p>':''}
  </form>`);
  $('#catalog-form').onsubmit=event=>{event.preventDefault();try{
   const f=new FormData(event.target),p=S.snapshot(),name=String(f.get('label')).trim(),description=String(f.get('description')).trim();
   if(sector){const value={id:old?.id||'sector-'+crypto.randomUUID(),label:name,description,color:f.get('color'),shape:f.get('shape')};if(old)p.catalog.sectors=p.catalog.sectors.map(x=>x.id===id?value:x);else p.catalog.sectors.push(value)}
   else if(old)renameTerm(p,cat,id,{...old,name,description,aliases:(old.aliases||[]).filter(a=>a.toLowerCase()!==name.toLowerCase())});else p.catalog.categories[cat].push({name,description});
   saved(p);
  }catch(e){$('#catalog-error').textContent=e.message}};
  if($('#catalog-delete'))$('#catalog-delete').onclick=()=>{try{
   const p=S.snapshot();if(usage(cat,id,p).total)throw Error('La voce è ancora utilizzata.');
   if(sector)p.catalog.sectors=p.catalog.sectors.filter(s=>s.id!==id);else p.catalog.categories[cat]=p.catalog.categories[cat].filter(t=>t.name!==id);
   saved(p);
  }catch(e){$('#catalog-error').textContent=e.message}};
 }
 $('#catalog-tabs').onclick=e=>{const b=e.target.closest('[data-catalog-category]');if(b){category=b.dataset.catalogCategory;$('#catalog-search').value='';render()}};
 $('#catalog-rows').onclick=e=>{const b=e.target.closest('[data-catalog-edit]');if(b)edit(b.dataset.catalogEdit)};
 $('#catalog-add').onclick=()=>edit();$('#catalog-search').oninput=render;
 $('#db-catalog').onclick=()=>{$('#catalog-panel').open=true;$('#catalog-panel').scrollIntoView({behavior:'smooth',block:'start'})};
 window.addEventListener('atlas-data-changed',render);
 window.AtlasCatalog={renameTerm,refresh:render};
 render();
})();
