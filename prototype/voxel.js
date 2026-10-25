/* Lazy HTTP-only 3D view. Existing classic-script/file:// views remain independent. */
(function(){
  'use strict';
  const W=window.officeVoxelWorld,M=window.officeVoxelMotion;
  const $=id=>document.getElementById(id);
  let active=false,generation=0,renderer=null,clock=null,selected='momo',palette='daylight',blocked='',lastFacts='',modulePromise=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const accounting={created:0,disposed:0,failures:0};
  const hiddenOld=['.office-layout','.office-hud','.legend','#movement-controls','#view-controls'];
  function constraint(){return document.hidden?'숨김 · 돌아온 뒤 재생 필요':reduced.matches?'동작 줄이기 · 다음 단계로 정적 탐색':'';}
  function message(value){$('voxel-message').textContent=value;}
  function detail(){if(!active)return;const state=clock?.state(),s=state?.actors.find(v=>v.id===selected)||W.staff.find(v=>v.id===selected);
    $('voxel-detail-title').textContent=s.name;
    const values=[['방 / 저장소',`${s.room==='mint-room'?'민트 작업실':'블루 작업실'} · ${s.repository}`],['Work / Task',s.task],['worktree 별칭',s.worktree],['session 별칭',s.session],['책상 / 의자',`${s.desk} / ${s.chair}`],['배치 근거','고정된 가상 연결 · 외형/위치에서 배정 추론 안 함'],['현재 연출',s.reason||'자기 의자 소켓의 정지 화면'],['실행 / 수락','가상 DEMO · 결과 ≠ 종료 ≠ Done · 실제 생존 미확인']];
    const dl=$('voxel-fields');dl.replaceChildren(...values.flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;return [dt,dd];}));
    document.querySelectorAll('[data-voxel-staff]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.voxelStaff===selected)));
  }
  function select(id){if(!W.staff.some(s=>s.id===id))return;selected=id;renderer?.select(id);detail();}
  function paint(state){if(!active)return;renderer?.update(state.actors,state.time);
    $('voxel-play').textContent=state.playing?'일시정지':'재생';$('voxel-play').setAttribute('aria-pressed',String(state.playing));$('voxel-play').disabled=!!state.reason||!!blocked||state.time>=125;
    $('voxel-time').textContent=`DEMO ${state.time.toFixed(1)}초 · ${state.playing?'재생':'정지'}${state.reason?' · '+state.reason:''}`;
    const facts=JSON.stringify(state.actors.map(s=>[s.phase,s.session]));if(facts!==lastFacts){lastFacts=facts;detail();}
    if($('voxel-debug').checked&&renderer){const i=renderer.info();$('voxel-stats').textContent=`WebGL2 · Three r${i.version} · ${i.render.calls} draws · ${i.render.triangles} triangles · ${i.memory.geometries} geometries · ${i.programs} programs · 4 actors · grid 1 / voxel ⅛ · staff 2 / desk .75 / wall 3`;} 
  }
  function suspend(){clock?.suspend(constraint());}
  function teardown(){generation++;clock?.dispose();clock=null;if(renderer){renderer.dispose();accounting.lastDisposed=renderer.info();renderer=null;accounting.disposed++;}$('voxel-host').replaceChildren();}
  async function start(){teardown();if(!active)return;blocked='';lastFacts='';const token=generation;
    $('voxel-retry').hidden=true;message('로컬 3D 모델 불러오는 중…');
    if(location.protocol==='file:'){fail('3D는 HTTP와 WebGL2가 필요합니다. 로컬 HTTP로 열거나 기존 2D 보기를 사용하세요.',token);return;}
    try{
      modulePromise??=import('./voxel-renderer.mjs');const module=await modulePromise;if(!active||token!==generation)return;
      renderer=module.createRenderer($('voxel-host'),{onSelect:select,onFailure(kind){if(!active||token!==generation)return;blocked=kind;clock?.suspend('WebGL 컨텍스트 중단 · 명시적 다시 시도 필요');message('3D 컨텍스트가 중단되었습니다. 다시 시도하거나 기존 2D 보기를 사용하세요.');$('voxel-retry').hidden=false;}});accounting.created++;
      renderer.palette(palette);renderer.debug($('voxel-debug').checked);clock=M.create({onChange:paint});clock.suspend(constraint());renderer.select(selected);detail();paint(clock.state());message('FICTIONAL · 실제 3D 기하 · 가상 저장소 2 / 책상 4 / 동료 4 · 실제 관찰 아님');
    }catch(_){if(token===generation&&active)fail('3D 모델 등록·치수·소켓 또는 WebGL2 초기화를 확인하세요. 다시 시도하거나 기존 2D 보기를 사용하세요.',token);}
  }
  function fail(reason,token){if(token!==generation)return;accounting.failures++;blocked=reason;message(reason);$('voxel-retry').hidden=false;$('voxel-play').disabled=true;}
  function mode(value){const next=value==='voxel';document.body.classList.toggle('voxel-mode',next);$('voxel-view').hidden=!next;hiddenOld.forEach(selector=>document.querySelectorAll(selector).forEach(node=>{if(next){if(!node.hasAttribute('data-voxel-old-hidden'))node.dataset.voxelOldHidden=String(node.hidden);node.hidden=true;}else if(node.hasAttribute('data-voxel-old-hidden')){node.hidden=node.dataset.voxelOldHidden==='true';delete node.dataset.voxelOldHidden;}}));
    $('skin-select').disabled=next;$('expression-play').disabled=next;
    if(next===active)return;active=next;if(active){document.querySelector('.sample-tag').textContent='3D VOXEL DEMO';start();}else teardown();
  }
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
  window.officeVoxel={mode,select,info:()=>({active,selected,palette,generation,accounting:{...accounting},state:clock?.state()||null,renderer:renderer?.info()||null}),project:id=>renderer?.project(id),
    // Scoped browser diagnostics; no timers or observation writes are created here.
    diagnostics:{lose:()=>renderer?.loseContext(),restore:()=>renderer?.restoreContext(),seek:t=>clock?.seekStatic(t)}};
})();
