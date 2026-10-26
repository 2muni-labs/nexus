/* Production DOM/WebGL checks with explicitly injected copies and controlled reads.
   Actual source captures/native input are recorded separately by the operator. */
async function runOfficeObservedTests(w){
 const d=w.document,$=id=>d.getElementById(id),results=[],assert=(v,label)=>{if(!v)throw Error(label);results.push(label);};
 const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
 const ready=async()=>{for(let i=0;i<200&&!w.officeVoxel.info().renderer;i++)await new Promise(r=>setTimeout(r,10));assert(!!w.officeVoxel.info().renderer,'actual renderer ready');};
 const actual=await (await w.fetch('./observed-office.json',{cache:'no-store'})).text(),copy=w.officeObserved.parse(actual);
 const RealReader=w.FileReader,realFetch=w.fetch,pending=[];
 function reader(){return pending[pending.length-1];}
 function importStart(raw){const file=new w.File([raw],'private-name-never-displayed.json'),transfer=new w.DataTransfer();transfer.items.add(file);$('observed-file').files=transfer.files;$('observed-file').dispatchEvent(new w.Event('change',{bubbles:true}));return reader();}
 function complete(r,raw){r.result=raw;r.onload();}
 function nextCopy(){const value=JSON.parse(actual);value.scope_alias='display-scope-'+Math.random().toString(16).slice(2).padEnd(16,'0').slice(0,16);return value;}
 w.FileReader=class{constructor(){pending.push(this);}readAsText(){}abort(){this.onabort?.();}};
 try{
  change('display-mode','campus');change('display-mode','voxel-observed');await ready();assert(w.officeVoxel.info().state===null,'observed owns no demo clock');assert(w.officeVoxel.info().renderer.actors===0,'empty observed hides fictional actors');
  let value=nextCopy(),r=importStart(JSON.stringify(value));complete(r,JSON.stringify(value));assert(!!w.officeVoxel.info().observed,'dedicated import accepted');assert(!d.body.textContent.includes('private-name-never-displayed'),'filename not rendered');
  assert($('voxel-fields').textContent.includes('not collected'),'acceptance/evidence remains unknown');assert($('evidence-panel').textContent.indexOf('PASS')<0,'old evidence cleared');
  const capture=w.officeVoxel.info().observed.capture;
  r=importStart(actual);assert(!w.officeVoxel.info().observed&&w.officeVoxel.info().renderer.actors===0,'selected file clears prior facts immediately');
  change('display-mode','voxel');await ready();complete(r,actual);r.onerror();r.onabort();assert(!w.officeVoxel.info().observedMode&&!!w.officeVoxel.info().state,'late observed callbacks cannot replace demo');
  change('display-mode','voxel-observed');await ready();
  value=nextCopy();r=importStart(JSON.stringify(value));complete(r,JSON.stringify(value));$('observed-file').dispatchEvent(new w.Event('cancel'));assert(!!w.officeVoxel.info().observed,'picker cancel preserves prechoice copy');
  const older=importStart(actual),newer=importStart(actual),newCopy=nextCopy();complete(newer,JSON.stringify(newCopy));complete(older,actual);assert(w.officeVoxel.info().observed.scope===newCopy.scope_alias,'late import cannot overwrite newer import');
  r=importStart(JSON.stringify(newCopy));complete(r,JSON.stringify(newCopy));assert(!w.officeVoxel.info().observed,'same capture means no new collection, clears facts');
  r=importStart('{}');complete(r,'{}');assert(!w.officeVoxel.info().observed,'bad import clears old copy');
  for(const kind of ['unavailable','partial','conflict','overflow']){const v=nextCopy();if(kind==='unavailable'){v.collection_state='unavailable';for(const k of ['sources','work_items','workspaces','tasks','sessions','relations'])v[k]=[];for(const k of ['work_items','workspaces','tasks','sessions'])v.coverage['observed_'+k]=0;v.diagnostics=['unavailable'];}else{v.collection_state='partial';v.diagnostics=[kind==='partial'?'partial':kind];if(kind==='conflict')v.relations.forEach(r=>r.status='conflict');else{v.sessions=[];v.coverage.observed_sessions=0;v.relations=v.relations.filter(r=>!r.session);}if(kind==='overflow')v.coverage.omitted_sessions=1;}r=importStart(JSON.stringify(v));complete(r,JSON.stringify(v));assert(w.officeVoxel.info().observed?.state===v.collection_state,'injected '+kind+' replaces previous copy');assert(w.officeVoxel.info().renderer.actors===0,'injected '+kind+' has no unsafe staff');}
  const oversized=importStart(' '.repeat(w.officeObserved.MAX_BYTES+1));assert(!w.officeVoxel.info().observed&&w.officeVoxel.info().renderer.actors===0,'oversize selected file clears old facts');
  const requests=[];w.fetch=(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}));$('observed-refresh').click();$('observed-refresh').click();assert(requests.length===2&&requests[0].options.signal.aborted,'new read aborts earlier fetch');
  const response=value=>({ok:true,url:new URL('./observed-office.json',w.location.href).href,redirected:false,headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify(value)));c.close();}})});
  const b=nextCopy();requests[1].resolve(response(b));await new Promise(r=>setTimeout(r,20));requests[0].resolve(response(nextCopy()));await new Promise(r=>setTimeout(r,20));assert(w.officeVoxel.info().observed.scope===b.scope_alias,'out-of-order fetch fenced');
  $('observed-refresh').click();requests[2].reject(Error('private error'));await new Promise(r=>setTimeout(r,20));assert(!w.officeVoxel.info().observed&&w.officeVoxel.info().renderer.actors===0,'failed refresh clears previous actors and data');
  w.fetch=realFetch;
  for(let i=0;i<20;i++){change('display-mode','campus');assert(!w.officeVoxel.info().renderer&&!w.officeVoxel.info().state,'cycle releases scene '+i);assert(!Object.values(w.officeVoxel.info().observedResources).some(Boolean),'cycle releases reads/timers '+i);change('display-mode','voxel-observed');await ready();}
  const i=w.officeVoxel.info();assert(i.accounting.lastDisposed.memory.geometries===0&&i.accounting.lastDisposed.listeners===0,'GPU and listeners disposed');
  assert(d.documentElement.scrollWidth<=w.innerWidth+1,'mobile/desktop no horizontal overflow');
  return {passed:results.length,results,viewport:[w.innerWidth,w.innerHeight],source:'production controller/WebGL with injected asynchronous readers/fetches; scripted input'};
 }finally{w.FileReader=RealReader;w.fetch=realFetch;change('display-mode','voxel-observed');}
}
