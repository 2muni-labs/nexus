/* One deterministic DEMO clock. Reservations are scenario facts, never liveness. */
(function(root){
  'use strict';
  const W=typeof module!=='undefined'?require('./voxel-world.js'):root.officeVoxelWorld;
  const speed=1.5, stages=[0,6,15,30,55,80,110,125,130,140];
  function checkedRoute(ids,graph){const r=W.route(ids,graph);if(r.reason)return r;const length=W.length(r.points);for(let d=0;d<=length;d+=.1){if(W.blocked(W.interpolate(r.points,d).position,.4))return {...r,reason:'경로 막힘 · 마지막 유효 의자 위치에서 대기'};}return r;}
  function schedule(graph=W.edges){let free=0;return [...W.staff].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id)).map(s=>{
    const outward=checkedRoute(s.route,graph),back=checkedRoute([...s.route].reverse(),graph),duration=W.length(outward.points)/speed;
    const start=Math.max(s.start,free),end=start+duration*2+3;
    free=end+1;return {id:s.id,requested:s.start,start,end,duration,outward,back,resource:'door-corridor-lounge'};
  });}
  const defaultSchedule=schedule();
  function sample(time,graph=W.edges){
    const entries=graph===W.edges?defaultSchedule:schedule(graph), frozen=time>=125;
    return W.staff.map(s=>{
      const trip=entries.find(e=>e.id===s.id),seat=W.socket(s.chair,'ground');
      let position={...seat},orientation=0,direction=0,pose='work',reason='자기 책상의 의자 · 가상 작업',phase='working';
      if(trip.outward.reason||trip.back.reason){pose='wait';phase='blocked';reason=trip.outward.reason||trip.back.reason;}
      else if(time>=s.start&&time<trip.start){pose='wait';phase='reserved';reason='좁은 문·복도 예약 대기 · 먼저 요청한 시각, 같은 시각은 ID 순서';}
      else if(time>=trip.start&&time<trip.end){
        const t=time-trip.start;
        if(t<trip.duration){const p=W.interpolate(trip.outward.points,t*speed);({position,orientation,direction}=p);pose='walk';phase='outbound';reason='명시한 문·복도 경유점 → 커피 라운지';}
        else if(t<trip.duration+3){position={...trip.outward.points.at(-1)};pose='wait';phase='lounge';reason='공유 커피 상호작용 지점 · 같은 Task / worktree / session';}
        else {const p=W.interpolate(trip.back.points,(t-trip.duration-3)*speed);({position,orientation,direction}=p);pose='walk';phase='return';reason='자기 의자 소켓으로 복귀 · 같은 세션';}
      }
      const next=time>=140, delivered=time>=130&&!next;
      if(frozen){position={...seat};pose='wait';phase=time<130?'unknown':delivered?'delivered':'new-session';reason=time<130?'생존 미확인 · 마지막 위치 고정 · 종료 추론 안 함':delivered?'가상 결과 전달 · 실행 성공 ≠ 종료 ≠ Done':'명시적 이전 세션 종료 후 NEW Task / worktree / session';}
      return {...s,task:next?`${s.task} · 새 작업`:s.task,worktree:next?`${s.worktree}-next`:s.worktree,session:next?`${s.session}-new`:s.session,
        previousSession:next?{id:s.session,status:'explicitly-exited-fictional'}:null,position,orientation,direction,pose,phase,reason,liveness:time>=125&&time<130?'unknown':next?'new':'fictional',delivered,
        reservation:time>=trip.start&&time<trip.end?trip.resource:null};
    });
  }
  // Wake at most one half-frame before a deadline: coalesced offscreen timers can add a frame.
  // Only the absolute 30Hz deadlines publish; this remains one owned cancelable callback.
  function create({onChange=()=>{},request=(cb,delay)=>setTimeout(()=>cb(now()),Math.min(16,delay)),cancel=id=>clearTimeout(id),now=()=>performance.now(),graph=W.edges}={}){
    let time=0,playing=false,reason='',generation=0,callback=null,last=0,nextPaint=0,disposed=false;
    function state(){return {time,playing,reason,generation,pending:callback!==null,actors:sample(time,graph)};}
    function publish(){onChange(state());}
    function stop(){playing=false;generation++;if(callback!==null)cancel(callback);callback=null;}
    function frame(stamp,token){if(disposed||!playing||token!==generation)return;callback=null;
      // Elapsed time is integrated only at accepted frames; pause accounts for the tail.
      time=Math.min(125,time+Math.max(0,stamp-last)/1000);last=stamp;
      // A 1.5ms tolerance handles native timer quantization without accumulating drift.
      if(stamp>=nextPaint-1.5||time===125){do{nextPaint+=1000/30;}while(nextPaint<=stamp+1.5);publish();}
      if(time>=125){stop();publish();return;}
      if(disposed||!playing||token!==generation)return;
      callback=request(t=>frame(t,token),Math.max(1,Math.floor(nextPaint-now())));
    }
    return {state,play(){if(disposed||reason||playing||time>=125)return;playing=true;last=now();nextPaint=last+1000/30;const token=++generation;callback=request(t=>frame(t,token),Math.max(1,Math.floor(nextPaint-now())));publish();},
      pause(){if(playing)time=Math.min(125,time+Math.max(0,now()-last)/1000);stop();publish();},
      next(){stop();time=stages.find(t=>t>time)??stages.at(-1);publish();},reset(){stop();time=0;publish();},
      suspend(value){if(playing)time=Math.min(125,time+Math.max(0,now()-last)/1000);stop();reason=value;publish();},
      dispose(){stop();disposed=true;},seekStatic(value){stop();time=Math.max(0,Math.min(140,value));publish();}};
  }
  const api={speed,stages,schedule,sample,create};if(typeof module!=='undefined')module.exports=api;else root.officeVoxelMotion=api;
})(typeof window!=='undefined'?window:globalThis);
