/* Untrusted presentation copies only. No native interpretation or control authority. */
(function(root){
  'use strict';
  const MAX_BYTES=256*1024,AGE=300000;
  const fields={
    root:'kind office_version scope_alias capture_alias started_at observed_at collection_state repository selection sources work_items workspaces tasks sessions relations coverage diagnostics',
    source:'alias kind started_at observed_at result read_complete inventory_complete reason',
    work:'alias url number label record_state workflow source workflow_source observed_at',
    workspace:'alias label board source observed_at',
    task:'alias task_alias workspace stage result source observed_at',
    session:'alias label kind workspace agent_liveness pty_liveness continuity source observed_at',
    relation:'alias workspace work_item session task kind status source observed_at',
    coverage:'selected_work_items selected_workspaces selected_runs observed_work_items observed_workspaces observed_tasks observed_sessions omitted_tasks omitted_sessions omitted_workspaces global_complete'
  };
  const enums={state:['collecting','observed','partial','unavailable'],source:['github-issue','github-project','orca-workspace','orca-task-index','orca-worker','orca-terminal','orca-reference','operator-binding'],result:['ok','unavailable','conflict','overflow'],reason:['selected','unknown','truncated','unsupported','failed','identity','time'],workflow:['Backlog','Ready','In Progress','Blocked','Review','Done'],board:['todo','in-progress','in-review','completed','unknown'],stage:['pending','dispatched','completed','blocked','unknown'],outcome:['in-progress','succeeded','failed','superseded','unknown'],live:['live','exited','unknown'],diagnostic:['unavailable','identity','conflict','overflow','time','unsupported','collecting','partial']};
  function need(value){if(!value)throw Error('Invalid observed copy');}
  function keys(v,name){need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(' ')===fields[name].split(' ').sort().join(' '));}
  function member(value,name){need(enums[name].includes(value));}
  function integer(v,max=Number.MAX_SAFE_INTEGER){need(Number.isSafeInteger(v)&&v>=0&&v<=max);}
  function alias(v,kind){need(typeof v==='string'&&new RegExp('^display-'+(kind||'[a-z]+')+'-[a-f0-9]{16}$').test(v)&&v.length<=48);}
  function time(v){need(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v);}
  function url(v,repo){need(typeof v==='string'&&new RegExp('^'+repo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/issues/[1-9][0-9]*$').test(v));}
  // Small JSON grammar pass rejects duplicate keys, excessive nesting and nonfinite numbers.
  function literal(raw){let i=0;function ws(){while(/\s/.test(raw[i]||'')&&i<raw.length)i++;}
    function string(){const start=i++;while(i<raw.length){const c=raw[i++];if(c==='"')return JSON.parse(raw.slice(start,i));if(c==='\\')i++;}throw Error('Invalid JSON');}
    function value(depth){need(depth<24);ws();let c=raw[i];if(c==='"')return string();if(c==='{'||c==='['){const object=c==='{',seen=new Set();i++;ws();if(raw[i]===(object?'}':']')){i++;return;}while(i<raw.length){if(object){need(raw[i]==='"');const key=string();need(!seen.has(key));seen.add(key);ws();need(raw[i++]===':');}value(depth+1);ws();if(raw[i]===(object?'}':']')){i++;return;}need(raw[i++]===',');ws();}need(false);}else{const match=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(raw.slice(i));need(match);need(!/^-?\d/.test(match[0])||Number.isFinite(Number(match[0])));i+=match[0].length;}}
    value(0);ws();need(i===raw.length);return JSON.parse(raw);
  }
  function parse(raw){need(typeof raw==='string'&&new TextEncoder().encode(raw).length<=MAX_BYTES);const v=literal(raw);keys(v,'root');need(v.kind==='nexus-office-presentation'&&v.office_version===1);alias(v.scope_alias,'scope');alias(v.capture_alias,'capture');time(v.started_at);time(v.observed_at);member(v.collection_state,'state');
    need(v.repository==='https://github.com/2muni-labs/nexus'||v.repository===null&&['collecting','unavailable'].includes(v.collection_state));
    const limits={selection:16,sources:128,work_items:16,workspaces:16,tasks:32,sessions:32,relations:64,diagnostics:16};
    for(const [key,max] of Object.entries(limits))need(Array.isArray(v[key])&&v[key].length<=max);
    need(new Set(v.selection).size===v.selection.length);v.selection.forEach(u=>url(u,v.repository));v.diagnostics.forEach(d=>member(d,'diagnostic'));need(new Set(v.diagnostics).size===v.diagnostics.length);
    const declared=new Map(),sources=new Map(),work=new Map(),workspaces=new Map(),tasks=new Map(),sessions=new Map();
    function register(row,kind,map){alias(row.alias,kind);need(!declared.has(row.alias));declared.set(row.alias,row);map.set(row.alias,row);}
    for(const s of v.sources){keys(s,'source');register(s,'source',sources);member(s.kind,'source');time(s.started_at);time(s.observed_at);member(s.result,'result');need(typeof s.read_complete==='boolean'&&(s.inventory_complete===null||typeof s.inventory_complete==='boolean'));member(s.reason,'reason');need(s.result==='ok'||!s.read_complete);}
    function fact(row){time(row.observed_at);need(sources.has(row.source));}
    for(const w of v.work_items){keys(w,'work');register(w,'work',work);fact(w);url(w.url,v.repository);integer(w.number);need(w.number>0&&w.url===v.repository+'/issues/'+w.number&&v.selection.includes(w.url)&&w.label==='Issue #'+w.number);need(['open','closed','unknown'].includes(w.record_state));if(w.workflow!==null)member(w.workflow,'workflow');need(w.workflow_source===null||sources.has(w.workflow_source));need(w.workflow===null?w.workflow_source===null:w.workflow_source!==null);}
    need(new Set(v.work_items.map(w=>w.url)).size===v.work_items.length);
    for(const w of v.workspaces){keys(w,'workspace');register(w,'workspace',workspaces);fact(w);need(/^Workspace [1-9][0-9]*$/.test(w.label));member(w.board,'board');}
    for(const t of v.tasks){keys(t,'task');register(t,'attempt',tasks);fact(t);alias(t.task_alias,'task');need(t.workspace===null||workspaces.has(t.workspace));member(t.stage,'stage');member(t.result,'outcome');need(!['succeeded','failed','superseded'].includes(t.result)||t.stage==='completed');}
    for(const s of v.sessions){keys(s,'session');register(s,'session',sessions);fact(s);need(/^Agent [1-9][0-9]*$/.test(s.label)&&s.kind==='terminal-agent'&&s.continuity==='unknown');need(s.workspace===null||workspaces.has(s.workspace));member(s.agent_liveness,'live');member(s.pty_liveness,'live');}
    for(const r of v.relations){keys(r,'relation');register(r,'relation',new Map());fact(r);need(workspaces.has(r.workspace)&&work.has(r.work_item));need(r.session===null||sessions.has(r.session));need(r.task===null||tasks.has(r.task));need(r.session===null||sessions.get(r.session).workspace===r.workspace);need(r.task===null||tasks.get(r.task).workspace===r.workspace);need(['native-linked','operator-declared'].includes(r.kind)&&['observed','conflict','unknown'].includes(r.status));need(r.kind==='operator-declared'?sources.get(r.source).kind==='operator-binding':sources.get(r.source).kind==='orca-reference');}
    keys(v.coverage,'coverage');for(const [k,n]of Object.entries(v.coverage)){if(k==='global_complete')need(n===false);else if(k.startsWith('omitted_')){if(n!==null)integer(n);}else integer(n);}
    need(v.coverage.selected_work_items===v.selection.length&&v.coverage.selected_workspaces<=16&&v.coverage.selected_runs<=4);
    for(const k of ['work_items','workspaces','tasks','sessions'])need(v.coverage['observed_'+k]===v[k].length);
    need(v.work_items.length<=v.coverage.selected_work_items&&v.workspaces.length<=v.coverage.selected_workspaces);
    if(['collecting','unavailable'].includes(v.collection_state))need(!v.work_items.length&&!v.workspaces.length&&!v.tasks.length&&!v.sessions.length&&!v.relations.length);
    return v;
  }
  function project(v,selection={},now=Date.now()){
    const stamp=Date.parse(v.observed_at),future=stamp>now||Date.parse(v.started_at)>stamp;
    const sourceMap=new Map(v.sources.map(s=>[s.alias,s]));
    function conflict(row){const s=sourceMap.get(row.source);return future||Date.parse(row.observed_at)<Date.parse(v.started_at)||Date.parse(row.observed_at)>stamp||!s||s.result!=='ok'||Date.parse(s.started_at)>Date.parse(s.observed_at)||Date.parse(s.observed_at)>stamp;}
    const historical=now-stamp>=AGE,scopeChanged=selection.scope&&selection.scope!==v.scope_alias;
    let page=scopeChanged?0:selection.page||0;page=Math.max(0,Math.min(Math.ceil(v.workspaces.length/2)-1,page));
    const pairs=v.relations.filter(r=>r.status==='observed'&&r.session&&r.task&&!conflict(r)&&!conflict(v.sessions.find(s=>s.alias===r.session))&&!conflict(v.tasks.find(t=>t.alias===r.task)));
    const ambiguous=new Set();for(const s of v.sessions){const rows=pairs.filter(r=>r.session===s.alias);if(new Set(rows.map(r=>r.workspace+':'+r.work_item+':'+r.task)).size>1)ambiguous.add(s.alias);}
    const safe=pairs.filter(r=>!ambiguous.has(r.session));
    const desks=v.workspaces.slice(page*2,page*2+2).map((workspace,slot)=>{
      const candidates=safe.filter(r=>r.workspace===workspace.alias&&!conflict(workspace));
      const choice=candidates.find(r=>r.session===selection.session)||candidates[0];
      const session=choice&&v.sessions.find(s=>s.alias===choice.session);
      const present=session&&session.agent_liveness!=='exited'&&session.pty_liveness!=='exited';
      return {slot,workspace,relations:v.relations.filter(r=>r.workspace===workspace.alias),candidates,session:present?session:null,relationship:choice||null,historical:historical||session?.agent_liveness!=='live'||session?.pty_liveness!=='live'};
    });
    return {scope:v.scope_alias,page,pages:Math.max(1,Math.ceil(v.workspaces.length/2)),desks,historical,future,
      conflicts:future||ambiguous.size>0||v.relations.some(r=>r.status==='conflict')||v.sources.some(s=>conflict({...s,source:s.alias})),
      unmapped_work:v.work_items.filter(w=>!v.relations.some(r=>r.work_item===w.alias&&r.status==='observed')),
      unmapped_sessions:v.sessions.filter(s=>!safe.some(r=>r.session===s.alias)),
      selection:scopeChanged?null:selection.workspace&&v.workspaces.some(w=>w.alias===selection.workspace)?selection.workspace:null};
  }
  // Capture watermarks survive failed reads. A same-capture pending -> final is the only same-ID advance.
  function createOrder(){const scopes=new Map();return {accept(v){const prior=scopes.get(v.scope_alias),time=Date.parse(v.started_at),rank=v.collection_state==='collecting'?0:1;
    if(prior&&(time<prior.time||v.capture_alias===prior.capture&&(rank<=prior.rank||time!==prior.time)||time===prior.time&&v.capture_alias!==prior.capture))return false;
    scopes.set(v.scope_alias,{time,rank,capture:v.capture_alias});return true;}};}
  const api={MAX_BYTES,AGE,fields,enums,parse,project,createOrder};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.officeObserved=api;
})(typeof window!=='undefined'?window:globalThis);
