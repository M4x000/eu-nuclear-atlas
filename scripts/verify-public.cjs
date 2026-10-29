/* Run with Node.js; no dependencies or network access needed. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let passed=0;
const check=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS '+name)};
const memory=new Map(),context={window:{addEventListener(){}},localStorage:{
 getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)
},document:{getElementById:()=>null},URL,console,structuredClone};
vm.createContext(context);
for(const f of ['data/atlas.js','data/schema.js','platform-model.js','database-store.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const D=context.window.ATLAS,S=context.window.AtlasStore;
check('270 organisations and 20 vacancy records',D.entities.length===270&&D.jobs.length===20);
check('268 in scope and 2 optional UK entries',D.entities.filter(e=>!e.outside).length===268&&D.entities.filter(e=>e.outside).length===2);
check('Vacancies use reviewed official publishers',D.jobs.every(j=>['jobs.dsi.infn.it','f4e-jobs.gestmax.eu'].includes(new URL(j.url).hostname)));
check('Source URL and original verification date on every record',D.entities.every(e=>e.sources.length&&e.sources.every(s=>S.isURL(s.url)&&S.date(s.checked)))&&D.jobs.every(j=>S.isURL(j.url)&&S.date(j.checked)));
check('All employer references resolve',D.jobs.every(j=>D.entities.some(e=>e.id===j.entity)));
check('No private migration snapshots',D.meta.jobBatches.length===0&&D.meta.archivedEntityIds.length===0);
check('Schema and model validation',S.validate(S.snapshot()));
check('Portable export/import round trip',S.validate(S.prepare(JSON.parse(JSON.stringify(S.snapshot())))));
S.commit(S.snapshot());
check('Public storage namespace',memory.has('nuclear-atlas-public-database-v1')&&!memory.has('nuclear-atlas-database-v1'));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const files=walk(root).filter(p=>!p.includes(path.sep+'.git'+path.sep));
check('No private workspace files',files.every(p=>!/(?:^|[\\/])(?:PROFILE\.md|AGENTS\.md|BRIEF\.md|PROGRESS\.md|backups|\.research|\.qa)(?:$|[\\/])/i.test(path.relative(root,p))));
const texts=files.filter(p=>p!==__filename).filter(p=>/\.(?:js|cjs|css|html|md|txt)$/.test(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
check('No private contact or credentials',!/(?:[A-Z0-9._%+-]+@(?:gmail|outlook|hotmail)\.com|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN .*PRIVATE KEY)/i.test(texts));
const payload=JSON.stringify(D.jobs);
check('Restricted vacancy payloads excluded',!/(?:framatome\.com|talent-soft\.com|orano\.group|esrf\.fr|cells\.es|private-use-only)/i.test(payload));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
check('All page assets exist with relative paths',[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('#')&&!/^(?:data:|https?:)/.test(u)).every(u=>!u.startsWith('/')&&fs.existsSync(path.join(root,u))));
for(const file of files.filter(p=>/\.(?:js|cjs)$/.test(p)))new vm.Script(fs.readFileSync(file,'utf8'),{filename:path.relative(root,file)});
check('All JavaScript parses',true);
check('Sample limitation visible on the page',html.includes('270 realtà · 20 annunci storici'));
check('Bundled licence notices retained',['leaflet-LICENSE.txt','markercluster-LICENSE.txt','MAPLIBRE-LICENSE.txt','MAPLIBRE-LEAFLET-LICENSE.txt','NATURAL-EARTH-LICENSE.txt'].every(f=>fs.existsSync(path.join(root,'vendor',f))));
console.log(`${passed} checks passed.`);
