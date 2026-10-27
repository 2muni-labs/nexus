/* Lazy HTTP-only 3D view. Existing classic-script/file:// views remain independent. */
(function(){
  'use strict';
  const W=window.officeVoxelWorld,M=window.officeVoxelMotion;
  const $=id=>document.getElementById(id);
  let active=false,generation=0,renderer=null,clock=null,selected='momo',palette='daylight',blocked='',lastFacts='',modulePromise=null;
  const O=window.officeObserved,order=O.createOrder();
  let observedMode=false,observed=null,observedGeneration=0,ownedFetch=null,ownedReader=null,ageTimer=null,readTimer=null;
  let observationSelection={},lastSuccess=null,selectedRecord=null,restoreFocus=null;
  function cancelObserved(){observedGeneration++;ownedFetch?.abort();ownedFetch=null;if(ownedReader){const reader=ownedReader;ownedReader=null;try{reader.abort();}catch(_){}}clearTimeout(ageTimer);ageTimer=null;clearTimeout(readTimer);readTimer=null;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const accounting={created:0,disposed:0,failures:0};
  const hiddenOld=['.office-layout','.office-hud','.legend','#movement-controls','#view-controls'];
  function constraint(){return document.hidden?'숨김 · 돌아온 뒤 재생 필요':reduced.matches?'동작 줄이기 · 다음 단계로 정적 탐색':'';}
  function text(node,value){if(node.textContent!==value)node.textContent=value;}
  function message(value){text($('voxel-message'),value);}
  function detail(){if(!active)return;if(observedMode){observedDetail();return;}const state=clock?.state(),s=state?.actors.find(v=>v.id===selected)||W.staff.find(v=>v.id===selected);
    $('voxel-detail-title').textContent=s.name;
    const values=[['방 / 저장소',`${s.room==='mint-room'?'민트 작업실':'블루 작업실'} · ${s.repository}`],['Work / Task',s.task],['worktree 별칭',s.worktree],['session 별칭',s.session],['책상 / 의자',`${s.desk} / ${s.chair}`],['배치 근거','고정된 가상 연결 · 외형/위치에서 배정 추론 안 함'],['현재 연출',s.reason||'자기 의자 소켓의 정지 화면'],['실행 / 수락','가상 DEMO · 결과 ≠ 종료 ≠ Done · 실제 생존 미확인']];
    const dl=$('voxel-fields');dl.replaceChildren(...values.flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;return [dt,dd];}));
    document.querySelectorAll('[data-voxel-staff]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.voxelStaff===selected)));
  }
  function select(id){if(observedMode){const projected=observed&&O.project(observed,observationSelection);const desk=projected?.desks.find(d=>W.staff[d.slot].id===id);if(!desk)return;observationSelection.workspace=desk.workspace.alias;selectedRecord=null;selected=id;renderer?.select(id);paintObserved();return;}if(!W.staff.some(s=>s.id===id))return;selected=id;renderer?.select(id);detail();}
  function paint(state){if(!active)return;renderer?.update(state.actors,state.time);
    // Motion renders at its native cadence; unchanged control labels need no DOM mutation.
    const play=$('voxel-play'),pressed=String(state.playing),disabled=!!state.reason||!!blocked||state.time>=125;
    text(play,state.playing?'일시정지':'재생');if(play.getAttribute('aria-pressed')!==pressed)play.setAttribute('aria-pressed',pressed);if(play.disabled!==disabled)play.disabled=disabled;
    text($('voxel-time'),`DEMO ${state.time.toFixed(1)}초 · ${state.playing?'재생':'정지'}${state.reason?' · '+state.reason:''}`);
    const facts=JSON.stringify(state.actors.map(s=>[s.phase,s.session]));if(facts!==lastFacts){lastFacts=facts;detail();}
    if($('voxel-debug').checked&&renderer){const i=renderer.info();text($('voxel-stats'),`WebGL2 · Three r${i.version} · ${i.render.calls} draws · ${i.render.triangles} triangles · ${i.memory.geometries} geometries · ${i.programs} programs · 4 actors · grid 1 / voxel ⅛ · staff 2 / desk .75 / wall 3`);}
  }
  function suspend(){clock?.suspend(constraint());}
  function teardown(){generation++;cancelObserved();clock?.dispose();clock=null;if(renderer){renderer.dispose();accounting.lastDisposed=renderer.info();renderer=null;accounting.disposed++;}$('voxel-host').replaceChildren();}
  async function start(){teardown();if(!active)return;blocked='';lastFacts='';const token=generation;
    $('voxel-retry').hidden=true;message('로컬 3D 모델 불러오는 중…');
    if(location.protocol==='file:'){fail('3D는 HTTP와 WebGL2가 필요합니다. 로컬 HTTP로 열거나 기존 2D 보기를 사용하세요.',token);return;}
    try{
      modulePromise??=import('./voxel-renderer.mjs');const module=await modulePromise;if(!active||token!==generation)return;
      renderer=module.createRenderer($('voxel-host'),{onSelect:select,onFailure(kind){if(!active||token!==generation)return;blocked=kind;clock?.suspend('WebGL 컨텍스트 중단 · 명시적 다시 시도 필요');message('3D 컨텍스트가 중단되었습니다. 다시 시도하거나 기존 2D 보기를 사용하세요.');$('voxel-retry').hidden=false;}});accounting.created++;
      renderer.palette(palette);renderer.debug($('voxel-debug').checked);if(observedMode){$('voxel-host').querySelector('canvas').setAttribute('aria-label','3D observed copy · illustrated desks and staff · not real-time');renderer.present({slots:[],actors:[]});paintObserved();message('Observed copy · explicit refresh · not real-time');return;}clock=M.create({onChange:paint});clock.suspend(constraint());renderer.select(selected);detail();paint(clock.state());message('FICTIONAL · 실제 3D 기하 · 가상 저장소 2 / 책상 4 / 동료 4 · 실제 관찰 아님');
    }catch(_){if(token===generation&&active)fail('3D 모델 등록·치수·소켓 또는 WebGL2 초기화를 확인하세요. 다시 시도하거나 기존 2D 보기를 사용하세요.',token);}
  }
  function fail(reason,token){if(token!==generation)return;accounting.failures++;blocked=reason;message(reason);$('voxel-retry').hidden=false;$('voxel-play').disabled=true;}
  function mode(value){const next=value==='voxel'||value==='voxel-observed',nextObserved=value==='voxel-observed',changed=nextObserved!==observedMode;
    document.body.classList.toggle('voxel-mode',next);document.body.classList.toggle('observed-mode',nextObserved);$('voxel-view').hidden=!next;
    hiddenOld.forEach(selector=>document.querySelectorAll(selector).forEach(node=>{if(next){if(!node.hasAttribute('data-voxel-old-hidden'))node.dataset.voxelOldHidden=String(node.hidden);node.hidden=true;}else if(node.hasAttribute('data-voxel-old-hidden')){node.hidden=node.dataset.voxelOldHidden==='true';delete node.dataset.voxelOldHidden;}}));
    $('skin-select').disabled=next;$('expression-play').disabled=next;
    $('observed-controls').hidden=!nextObserved;document.querySelectorAll('.voxel-clock,.voxel-note').forEach(n=>n.hidden=nextObserved);
    $('voxel-view').setAttribute('aria-label',nextObserved?'3D observed copy · not real-time':'3D 복셀 오피스 · 가상 DEMO');
    $('voxel-disclaimer').textContent=nextObserved?'관찰 사본 · 위치와 외형은 그림 · 원본 연결과 운영자 연결은 구분됩니다. 실행 결과는 생존, 수락 또는 Done을 증명하지 않습니다.':'네 동료의 이름과 신원은 그림과 분리되어 있습니다. 이 화면은 실시간 배정, 실행, 승인 또는 수락 증거를 제공하지 않습니다.';
    $('voxel-detail-kind').textContent=nextObserved?'OBSERVED COPY · ILLUSTRATED POSITION':'FICTIONAL DESK NOTE';
    document.querySelector('.voxel-heading span').textContent=nextObserved?'첫 방: 선택한 저장소 · 두 번째 방: 관찰하지 않은 장식':'민트 작업실 · 블루 작업실 · 커피 라운지';
    if(next===active&&!changed)return;active=next;observedMode=nextObserved;observed=null;observationSelection={};selectedRecord=null;restoreFocus=null;selected='momo';
    if(nextObserved){window.officeEvidence?.render($('evidence-panel'),null);$('observed-status').textContent='관찰 미확인 · Refresh 또는 Import를 선택하세요.';}
    else{$('voxel-staff').replaceChildren(...W.staff.map(staffButton));}
    if(active){document.querySelector('.sample-tag').textContent=observedMode?'3D OBSERVED COPY':'3D VOXEL DEMO';start();}else teardown();
  }
  function staffButton(s){const b=document.createElement('button');b.type='button';b.dataset.voxelStaff=s.id;b.textContent=s.name;b.addEventListener('click',()=>select(s.id));return b;}
  function relationLabel(kind){return kind==='operator-declared'?'운영자 연결':'원본 연결';}
  function projection(){return observed&&O.project(observed,observationSelection);}
  function observedDetail(){if(observed&&selectedRecord){const row=observed[selectedRecord.kind]?.find(r=>r.alias===selectedRecord.alias);if(row){$('voxel-detail-title').textContent=row.label||'Observed task / attempt';$('voxel-fields').replaceChildren(...Object.entries(row).flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value===null?'unknown':String(value);return[dt,dd];}));const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent='CI / review / validation / acceptance / Done';dd.textContent='not collected · unknown';$('voxel-fields').append(dt,dd);return;}selectedRecord=null;}const p=projection(),desk=p?.desks.find(d=>d.workspace.alias===observationSelection.workspace);$('voxel-detail-title').textContent=desk?.workspace.label||'관찰 기록 선택';
    const related=desk?.relations.map(r=>observed.work_items.find(w=>w.alias===r.work_item)).filter(Boolean)||[];
    const tasks=observed?.tasks.filter(t=>t.workspace===desk?.workspace.alias)||[];
    const values=[['저장소',observed?.repository||'미확인'],['책상',desk?desk.workspace.alias:'배치 없음'],['워크플로',related.map(w=>w.label+' · '+(w.workflow||'unknown')+' · record '+w.record_state).join(' / ')||'연결 미확인'],['Task / attempt',tasks.map(t=>t.stage+' / '+t.result+' · '+t.observed_at).join(' / ')||'unknown'],['세션',desk?.session?desk.session.alias:'현재 표시할 연결 세션 없음'],['에이전트 / PTY',desk?.session?desk.session.agent_liveness+' / '+desk.session.pty_liveness:'unknown / unknown'],['연결 근거',desk?.relationship?relationLabel(desk.relationship.kind)+' · '+desk.relationship.observed_at:'미확인'],['표시',desk?.historical?'historical / ? · 현재 활동 증거 없음':'정적 그림 · 위치/타이핑 관찰 없음'],['CI / review / validation / acceptance / Done','not collected · unknown']];
    $('voxel-fields').replaceChildren(...values.flatMap(([k,v])=>{const a=document.createElement('dt'),b=document.createElement('dd');a.textContent=k;b.textContent=v;return[a,b];}));
    for(const w of related){const a=document.createElement('a');a.href=w.url;a.textContent=w.label;a.target='_blank';a.rel='noopener noreferrer';$('voxel-fields').append(a);}
  }
  function paintObserved(){if(!active||!observedMode)return;const p=projection();clearTimeout(ageTimer);ageTimer=null;
    if(!p){renderer?.present({slots:[],actors:[]});$('voxel-staff').replaceChildren();$('observed-lists').replaceChildren();$('observed-session').replaceChildren(new Option('연결 세션 없음',''));$('observed-page').textContent='0 / 0';$('observed-prev').disabled=true;$('observed-next').disabled=true;observedDetail();return;}
    observationSelection.scope=p.scope;observationSelection.page=p.page;
    if(!p.desks.some(d=>d.workspace.alias===observationSelection.workspace))observationSelection.workspace=p.desks[0]?.workspace.alias||null;
    const chosen=p.desks.find(d=>d.workspace.alias===observationSelection.workspace);selected=chosen?W.staff[chosen.slot].id:'';
    const actors=p.desks.filter(d=>d.session).map(d=>{const s=W.staff[d.slot],position=W.socket(s.chair,'ground');return{id:s.id,chair:s.chair,position,orientation:W.transform(W.instances.find(i=>i.id===s.chair)).orientation,pose:'wait',phase:'unknown'};});
    renderer?.present({slots:p.desks.map(d=>W.staff[d.slot].id),actors});renderer?.select(selectedRecord?'':selected);
    const existing=new Map([...$('voxel-staff').children].map(b=>[b.dataset.workspace,b]));
    const buttons=p.desks.map(d=>{const id=d.workspace.alias,b=existing.get(id)||document.createElement('button');b.type='button';b.dataset.workspace=id;b.textContent=d.workspace.label+' · '+(d.session?(d.historical?'? historical':'static illustration'):'연결 직원 없음');b.setAttribute('aria-pressed',String(id===observationSelection.workspace));if(!existing.has(id))b.addEventListener('click',()=>select(W.staff[projection().desks.find(d=>d.workspace.alias===id).slot].id));return b;});
    if(buttons.length!==$('voxel-staff').children.length||buttons.some((b,i)=>$('voxel-staff').children[i]!==b))$('voxel-staff').replaceChildren(...buttons);
    const picker=$('observed-session');picker.replaceChildren(...(chosen?.candidates.length?chosen.candidates.map(r=>new Option(observed.sessions.find(s=>s.alias===r.session).label+' · '+relationLabel(r.kind),r.session)):[new Option('연결 세션 없음','')]));picker.value=chosen?.relationship?.session||'';
    text($('observed-page'),`${p.page+1} / ${p.pages} · workspace ${observed.workspaces.length}`);$('observed-prev').disabled=p.page===0;$('observed-next').disabled=p.page+1>=p.pages;
    const lists=$('observed-lists');lists.replaceChildren();function record(kind,row,label){const b=document.createElement('button');b.type='button';b.dataset.recordKind=kind;b.dataset.recordAlias=row.alias;b.textContent=label;b.addEventListener('click',()=>{selectedRecord={kind,alias:row.alias};renderer?.select('');observedDetail();});lists.append(b);}function line(value){const e=document.createElement('p');e.textContent=value;lists.append(e);}
    line(`scope ${observed.scope_alias} · capture ${observed.capture_alias}`);line(`source window ${observed.started_at} → ${observed.observed_at} · ${observed.collection_state} · ${p.future?'TIME CONFLICT':p.historical?'historical / stale (5 min)':'saved copy / current state unproven'}`);
    line('coverage '+JSON.stringify(observed.coverage));line('diagnostics '+(observed.diagnostics.join(', ')||'none')+' · conflicts '+p.conflicts);
    for(const src of observed.sources)line(`${src.kind} · ${src.result} · ${src.started_at} → ${src.observed_at} · read ${src.read_complete} / inventory ${src.inventory_complete??'unknown'} · ${src.reason}`);
    for(const w of observed.work_items)record('work_items',w,`${w.label} · record ${w.record_state} / workflow ${w.workflow??'unknown'} · ${w.observed_at}${p.unmapped_work.includes(w)?' · unmapped work':''}`);
    for(const w of observed.workspaces){const b=document.createElement('button');b.type='button';b.dataset.recordKind='workspaces';b.dataset.recordAlias=w.alias;b.textContent=w.label+' · board '+w.board+' · '+w.observed_at;b.addEventListener('click',()=>{observationSelection.page=Math.floor(observed.workspaces.indexOf(w)/2);observationSelection.workspace=w.alias;selectedRecord=null;paintObserved();});lists.append(b);}
    for(const t of observed.tasks)record('tasks',t,`Task ${t.task_alias} / attempt ${t.alias} · ${t.stage} / ${t.result} · ${t.observed_at}`);
    for(const session of observed.sessions)record('sessions',session,`${session.label} · ${session.alias} · agent ${session.agent_liveness} / PTY ${session.pty_liveness} · ${session.observed_at} · continuity unknown${p.unmapped_sessions.includes(session)?' · unmapped session':''}`);
    observedDetail();const expiry=Date.parse(observed.observed_at)+O.AGE-Date.now();if(expiry>0)ageTimer=setTimeout(()=>{ageTimer=null;paintObserved();},expiry+1);
  }
  function beginRead(){const focused=document.activeElement,data=focused?.dataset;if(data?.workspace)restoreFocus={workspace:data.workspace};else if(data?.recordAlias)restoreFocus={kind:data.recordKind,alias:data.recordAlias};else if(focused!==document.body)restoreFocus=null;cancelObserved();const token=observedGeneration;observed=null;paintObserved();$('observed-status').textContent='읽는 중 · 이전 관찰 지움 · static file only';return token;}
  function readFailure(token,reason){if(!active||!observedMode||token!==observedGeneration)return;observed=null;paintObserved();$('observed-status').textContent=reason+' · 표시 데이터 없음 · no collection endpoint';}
  function acceptObserved(raw,token){if(!active||!observedMode||token!==observedGeneration)return;try{const value=O.parse(raw),accepted=order.accept(value);if(!accepted){readFailure(token,'이전 관찰 또는 같은 수집 ID의 변경된 사본 거부');return;}const changed=observationSelection.scope&&observationSelection.scope!==value.scope_alias;observed=value;if(changed){observationSelection={};selectedRecord=null;restoreFocus=null;}paintObserved();if(restoreFocus&&document.activeElement===document.body){const buttons=[...$('voxel-staff').children,...$('observed-lists').children];buttons.find(b=>restoreFocus.workspace?b.dataset.workspace===restoreFocus.workspace:b.dataset.recordKind===restoreFocus.kind&&b.dataset.recordAlias===restoreFocus.alias)?.focus();}restoreFocus=null;const p=projection();$('observed-status').textContent=`관찰 사본 · ${value.collection_state} · ${value.observed_at}${accepted==='unchanged'?' · 새 수집 없음 · 같은 저장 사본 다시 표시':''} · ${p.future?'시각 충돌':p.historical?'과거 관찰 · 현재 상태 미확인':'저장 사본 · 현재 상태 미확인'} · 실시간 아님${changed?' · scope changed / selection reset':''}`;if(['observed','partial'].includes(value.collection_state)){lastSuccess=value.observed_at;$('observed-history').textContent='마지막 수락 사본 '+lastSuccess+' · 이 파일만으로 원본 출처를 확인할 수 없습니다.';}}catch(_){readFailure(token,'관찰 파일 형식/크기 오류');}}
  async function refreshObserved(){if(!active||!observedMode)return;const token=beginRead(),controller=new AbortController();ownedFetch=controller;readTimer=setTimeout(()=>controller.abort(),15000);let stream;
    try{const response=await fetch('./observed-office.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal,headers:{'Cache-Control':'no-cache'}});if(token!==observedGeneration)return;const expected=new URL('./observed-office.json',location.href);if(!response.ok||response.redirected||response.url!==expected.href||Number(response.headers.get('Content-Length'))>O.MAX_BYTES)throw Error();stream=response.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let raw='',bytes=0;while(true){const {done,value}=await stream.read();if(token!==observedGeneration){await stream.cancel();return;}if(done)break;bytes+=value.byteLength;if(bytes>O.MAX_BYTES)throw Error();raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();acceptObserved(raw,token);
    }catch(_){if(stream)try{await stream.cancel();}catch(_){}readFailure(token,'관찰 파일 읽기 실패');}finally{if(token===observedGeneration){ownedFetch=null;clearTimeout(readTimer);readTimer=null;}}
  }
  $('observed-refresh').addEventListener('click',refreshObserved);
  $('observed-import').addEventListener('click',()=>{cancelObserved();$('observed-file').value='';$('observed-file').click();});
  $('observed-file').addEventListener('cancel',()=>{cancelObserved();paintObserved();});
  $('observed-file').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(!file){cancelObserved();paintObserved();return;}const token=beginRead();if(file.size>O.MAX_BYTES){readFailure(token,'관찰 파일 최대 256 KiB');return;}const reader=new FileReader();ownedReader=reader;reader.onload=()=>{if(token!==observedGeneration)return;ownedReader=null;acceptObserved(reader.result,token);};reader.onerror=reader.onabort=()=>{if(token!==observedGeneration)return;ownedReader=null;readFailure(token,'관찰 파일 읽기 실패');};try{reader.readAsText(file);}catch(_){readFailure(token,'관찰 파일 읽기 실패');}});
  $('observed-prev').addEventListener('click',()=>{observationSelection.page=Math.max(0,(observationSelection.page||0)-1);paintObserved();});
  $('observed-next').addEventListener('click',()=>{observationSelection.page=(observationSelection.page||0)+1;paintObserved();});
  $('observed-session').addEventListener('change',event=>{observationSelection.session=event.target.value;paintObserved();});
  $('voxel-staff').replaceChildren(...W.staff.map(s=>{const b=document.createElement('button');b.type='button';b.dataset.voxelStaff=s.id;b.textContent=s.name;b.addEventListener('click',()=>select(s.id));return b;}));
  $('voxel-play').addEventListener('click',()=>{if(!clock)return;if(clock.state().playing)clock.pause();else{clock.suspend(constraint());clock.play();}});
  $('voxel-next').addEventListener('click',()=>clock?.next());$('voxel-reset').addEventListener('click',()=>clock?.reset());
  $('voxel-retry').addEventListener('click',()=>start());
  $('voxel-fallback').addEventListener('click',()=>{const select=$('display-mode');select.value='campus';select.dispatchEvent(new Event('change',{bubbles:true}));});
  $('voxel-palette').addEventListener('change',e=>{clock?.pause();palette=e.target.value;renderer?.palette(palette);});
  document.querySelectorAll('[data-voxel-camera]').forEach(b=>b.addEventListener('click',()=>renderer?.camera(b.dataset.voxelCamera)));
  $('voxel-debug').addEventListener('change',()=>{renderer?.debug($('voxel-debug').checked);$('voxel-stats').hidden=!$('voxel-debug').checked;if(clock)paint(clock.state());});
  document.addEventListener('visibilitychange',suspend);reduced.addEventListener('change',suspend);
  $('skin-select').addEventListener('change',()=>clock?.pause());
  for(const id of ['snapshot-file','refresh-input'])$(id).addEventListener('change',()=>clock?.pause());
  window.addEventListener('pagehide',teardown);
  window.officeVoxel={mode,select,info:()=>({active,selected,palette,generation,accounting:{...accounting},state:clock?.state()||null,observedMode,observed:observed?{capture:observed.capture_alias,scope:observed.scope_alias,state:observed.collection_state,projection:projection()}:null,observedResources:{fetch:!!ownedFetch,reader:!!ownedReader,age:!!ageTimer,timeout:!!readTimer},renderer:renderer?.info()||null}),project:id=>renderer?.project(id),
    // Scoped browser diagnostics; no timers or observation writes are created here.
    diagnostics:{lose:()=>renderer?.loseContext(),restore:()=>renderer?.restoreContext(),seek:t=>clock?.seekStatic(t)}};
})();
