# 작은 오피스

`index.html`을 브라우저에서 직접 열면 됩니다. 서버, 설치, 빌드는 필요하지 않습니다.

네 개의 책상을 클릭하거나 Tab으로 이동한 뒤 Enter / Space를 눌러 상세 정보를 확인하세요. 작은 화면에서는 상세 패널이 장면 아래에 배치됩니다. 기본 시뮬레이션 스킨은 작은 직원의 로컬 표정만 재현합니다. 표정 재생과 이동 DEMO 시나리오 재생은 별개입니다.

캐릭터, 작업, 상태는 `sample-data.js`의 고정된 가상 샘플입니다. Nexus / Orca 연동, 실시간 관찰, 실제 Issue, 완료 또는 승인 증거를 제공하지 않습니다. 시스템에 설치된 한국어 글꼴을 사용하며 외부 리소스를 요청하지 않습니다.

## 관찰 사본 가져오기 (v1)

표시 선택에서 데모 / 스냅샷을 전환하거나 JSON 파일을 가져오세요. 한 Work Item은 한 책상이며 나머지는 빈 장식입니다. 캐릭터는 작업의 삽화이고 실제 에이전트 배정의 증거가 아닙니다. GitHub Workflow와 실행 관찰은 별도이며, 실행 성공은 Done·승인·수락·현재 생존을 뜻하지 않습니다. 시각은 UTC로 표시하고 24시간 초과 또는 미래 시각을 경고합니다. 자동 갱신은 없습니다.

다음은 **완전히 가상의 형식 예시**입니다. 실제 관찰 데이터는 저장소에 넣지 마세요.

```json
{
  "version": 1,
  "observed_at": "2026-01-01T00:00:00Z",
  "work": {
    "url": "https://github.com/example/fiction/issues/1",
    "title": "가상의 화분 배치 작업",
    "workflow_status": "Review"
  },
  "execution": {"status": "succeeded", "source": "가상 수동 관찰 예시"}
}
```

파일 크기는 최대 16 KiB입니다. version, observed_at, work와 work.url/title은 필수입니다. execution 및 nullable status/source는 생략 또는 null이면 미확인입니다. 그 외 키는 거부합니다. UTC 시각은 초 단위 또는 밀리초 3자리 ISO 형식이어야 합니다. title은 160자, source는 240자, 상태 문자열은 80자까지이며 제어 문자와 알려진 호스트 경로·네이티브 ID 패턴은 거부합니다. Issue 주소는 `https://github.com/OWNER/REPO/issues/POSITIVE_INTEGER`만 허용하며 쿼리·fragment는 허용하지 않습니다.

Workflow 인식 값은 `Backlog`, `Ready`, `In Progress`, `Blocked`, `Review`, `Done`입니다. 실행 인식 값은 `running`, `awaiting_input`, `succeeded`, `failed`, `cancelled`, `unknown`입니다. 다른 상태 문자열은 미확인으로 표시합니다. 출처가 없으면 출처 미확인을 별도로 표시합니다. source는 사람이 정리한 짧은 근거 설명이며 인증이나 원본 영수증 검증을 제공하지 않습니다.

이 형식은 표시용 데이터이며 네이티브 backend 영수증, 복구 또는 정책 입력이 아닙니다. 가져오기 전에 비공개 경로·식별자·자격 증명을 제거하세요. 패턴 검사는 모든 민감 정보 탐지를 보장하지 않습니다. 파일은 FileReader/JSON.parse로 브라우저 메모리에서만 읽고 네트워크 전송이나 localStorage 저장을 하지 않습니다. 입력 문자열은 DOM textContent로 표시합니다. 실패하면 이전 사본을 지우고 미확인으로 표시하며 데모는 계속 사용할 수 있습니다. 새로고침하면 사본은 사라집니다.

검증: `node --check prototype/app.js`, `node --check prototype/snapshot.js`, `node prototype/snapshot.test.cjs`. 빌드나 패키지 설치는 없습니다.

## 오피스 전체 스킨 (Issue29)

`index.html`은 `file://`로 직접 열 수 있습니다. 스킨 선택은 **방 전체·책상·캐릭터·상세 초상화·이동 DEMO 배우**를 함께 바꿉니다. 바닥·벽·창문·식물·소파·탁자·고양이·장면 배경도 같은 스킨입니다. 선택 가능한 일러스트는 네 캐릭터의 기존 모습을 유지하고, 픽셀 시험은 한 가지 귀여운 기본 캐릭터와 한 가지 아이소메트릭 책상을 공유합니다. 이름·작업·상태의 색과 기호는 공통 화면이 표시하므로 캐릭터의 칠 색은 상태를 뜻하지 않습니다.

`scene.js`는 네 책상의 위치, 시각적 책상/캐릭터/작업 연결과 캐릭터 부착 위치를 관리합니다. `visual-desk-*`, `visual-character-*`, `demo-work-*`는 표시용 임시 식별자이며 실제 worktree·session·agent assignment ID가 아닙니다. 실제 Work Item은 가져온 Issue URL로 구분하지만, 환경/세션 관계가 없으므로 첫 책상에 **잠정적인 삽화 위치**로 놓습니다. 향후 실제 엔티티 관계가 제공되기 전에는 이 위치에서 배정·실행 관계를 추론하지 않습니다. 스냅샷 v1 필드는 추가하지 않았습니다.

`skins.js`는 로컬 `assets/` 파일을 참조하는 작은 정적 JS 목록입니다. 모듈·fetch·설치·빌드 없이 classic deferred script로 읽습니다. 각 스킨의 `room`, `roomFront`, `desk`와 `characters` 항목에서 `src`를 SVG 또는 PNG 파일로 교체하면 됩니다. 공통 renderer는 SVG `<image>`로 두 형식을 똑같이 표시합니다. SVG 안에 외부 리소스를 넣지 마세요.

| 등록값 | 캐릭터 | 책상 | 방 / 앞쪽 소품 |
| --- | --- | --- | --- |
| 논리 프레임 `width × height` | 100 × 125 | 240 × 240 | 880 × 790 |
| 논리 기준점 `anchor` | (50, 70) | (64, 80) | (0, 0) |
| 장면 표시 크기 `display` | 100 × 125 | 240 × 240 | 880 × 790 |

기준점은 그림 안의 좌표이며 장면의 부착 위치에 맞춥니다. 기존 캐릭터 좌표는 프레임 내부에서 `(50,70)`, 책상은 `(64,80)`만큼 이동하여 보존했습니다. 다른 해상도의 PNG도 동일한 논리 프레임 비율과 기준점에 맞춰 여백까지 내보내세요. 다른 논리 프레임을 등록하면 기준점을 함께 조정하세요. 표시 크기가 바뀌면 renderer가 기준점도 같은 비율로 조정합니다. 책상 hit area·선택/포커스 테두리·명패·상태 배지는 그림 밖 공통 renderer가 소유합니다. 그림을 바꾸어도 그 동작과 작업 데이터는 바뀌지 않습니다.

픽셀 SVG는 정수 좌표로 직접 작성하고 `shape-rendering="crispEdges"`를 사용합니다. `pixelated: true` 등록은 `<image>`에 `image-rendering: pixelated`를 적용합니다. 화면 전체는 반응형으로 축소될 수 있습니다. `assets/compatibility-check.png`와 `officePngFixture`는 SVG/PNG 호환성 검사용 작은 체크무늬이며 완성 디자인이나 사용자 선택 스킨이 아닙니다. 브라우저 QA에서는 메모리의 등록 항목을 이 fixture로 일시 교체하여 같은 renderer를 확인할 수 있습니다.

방은 기존 가림 순서를 지키는 두 개의 고정 레이어입니다: `room`은 책상 뒤의 방 전체, `roomFront`는 책상·이동 배우 앞의 고양이입니다. 기존 일러스트 도형은 로컬 SVG로 그대로 분리했습니다. 두 레이어 모두 880×790 투명 프레임과 좌상단 (0,0) 기준점을 유지하세요. PNG 교체도 같은 프레임/여백으로 내보내면 됩니다. 배경색도 `room` 파일 안에 있으며 페이지에는 일러스트 전용 배경 도형이 남지 않습니다. 픽셀 방은 정수 좌표와 crispEdges로 만든 정적 도형이며 새 이동·상태·엔티티 기능을 추가하지 않습니다. SVG는 script/foreignObject/이벤트 속성/외부 참조 없이 로컬 조각 참조만 사용하세요.

등록 항목 누락·잘못된 크기/기준점 또는 파일 로드 실패는 `! 이미지 오류`로 표시하며 다른 스킨으로 몰래 대체하지 않습니다. 명패·선택·상세 정보·스킨 선택은 유지됩니다. 장면 아래 오류 안내와 **이미지 다시 불러오기** 버튼으로 복구하거나 스킨을 바꿀 수 있습니다. 성공한 교체는 이전 오류를 지우고, 이전 요청의 늦은 이벤트는 새 그림에 영향을 주지 않습니다. 이 오류는 작업/실행 상태 미확인과 별개입니다.

스킨 변경은 import/reset을 호출하지 않고 기존 책상 DOM을 유지합니다. 따라서 가져온 사본·표시 모드·선택·책상 키보드 포커스를 보존하며, 선택 컨트롤을 조작할 때 포커스를 빼앗지 않습니다. 스킨·사본·선택은 메모리에만 있고 새로고침하면 기본 시뮬레이션/데모로 돌아옵니다. 이동·수집·편집 기능은 이 시험 범위에 없습니다.

## 이동 DEMO · 세션 배정 (Issue26)

표시에서 **이동 DEMO · 세션 배정**을 선택하세요. 두 책상은 각각 고정된 가상 Task / worktree입니다. 등장 → 가상 배정 확인 → 작업 → 생존 미확인(?) → 배정 해제·같은 책상 옆으로 물러남 → 동일 세션의 동일 Task / worktree 복귀 → 결과 전달·Review 대기 → 명시적 세션 종료 → 퇴장 → 새 세션 등장 → 새 Task / 새 worktree 배정 → 새 작업 순서입니다. 같은 외형이 재등장해도 `demo-session-1`과 `demo-session-2`는 서로 다른 신원입니다. 실제 Orca 세션·영수증 검증·스케줄링 권한을 제공하지 않습니다.

결과 전달만으로 캐릭터가 떠나지 않습니다. 생존 미확인 단계는 마지막 관찰 위치에 `?`를 남기고 종료를 추측하지 않습니다. 명시적 종료도 수락·Done·worker release·삭제 자격을 부여하지 않습니다. 상세 패널은 선택한 Task / worktree와 현재 시나리오 세션·배정·근거를 구분합니다. 초상화는 외형 예시입니다.

처음에는 정지 상태입니다. 재생은 2.2초마다 다음 관찰을 표시하며 마지막 단계에서 정지합니다. 일시정지는 현재 관찰 단계를 유지하며 짧은 시각적 이동은 해당 위치까지 마칩니다. 다음 단계는 재생을 정지하고 한 단계만 진행합니다. 처음으로는 정지 후 첫 등장으로 돌아갑니다. 스킨·표시 모드 변경과 JSON 가져오기도 재생을 정지합니다. 이동 DEMO로 돌아오면 이전 단계를 유지합니다. reduced-motion에서는 위치가 즉시 바뀌며 같은 사실·제어를 유지합니다. 데모4 / snapshot-v1 데이터 형식은 그대로입니다.

`movement.js`가 고정된 사실과 취소 가능한 재생 제어를 관리하고 공통 renderer가 기존 SVG/PNG 스킨으로 그립니다. 데이터·스킨·이동 좌표는 분리되어 있으며 저장·수집·네트워크 요청은 없습니다. 추가 검증: `node prototype/movement.test.cjs` 및 `node --check prototype/movement.js`.

## Manual office observation envelope (v2, Issue27)

The separate **관찰 스냅샷** view accepts a manually sanitized v2 file. It never turns the fictional movement DEMO into a live view. [snapshot-v2-example.json](snapshot-v2-example.json) is a **fictional shape example**, never an actual observation. Real private inputs must stay outside tracked files. This is a bounded presentation envelope, not a new core/backend contract, collector, authenticated receipt, or Nexus policy input.

V2 preserves v1 `observed_at`, `work` and `execution` meanings and limits, changes `version` to `2`, and allows one optional `office` object (omitted/null = missing). Root GitHub Workflow and execution result remain separate. The exact office shape is:

| Field | Shape / limit |
| --- | --- |
| `source` | sanitized manual observation description, text ≤240 or null |
| `observed_at` | required valid UTC ISO timestamp, seconds or exactly three fractional digits |
| `coverage` | exactly `"single-record"`; never a complete fleet |
| `repository` | null or `{alias, label, url}`; repository = room label |
| `workspace` | null or `{alias, label, repository}`; workspace/worktree = selectable desk; `repository` references repository alias |
| `session` | null or `{alias, label, workspace, liveness, source, observed_at}`; session = character only when the relation is usable; `workspace` is a display alias or null |
| `assignment` | null or `{session, workspace, work_url, source, observed_at}`; explicit session/workspace/Work Item relation |
| `retention` | null or `{state, source}`; a separate checkout retention claim |

Office `source` and component objects may be omitted or null; missing source fields in components also mean missing evidence. Other listed component keys and office `observed_at`/`coverage` are required when their object is present; extra or duplicate JSON keys, arrays and wrong types reject. `label` is nonempty text ≤80. Aliases are **path-free display aliases**, `display-` plus 1–33 lowercase letters/digits/hyphens (first suffix character alphanumeric), ≤40 total. Entity aliases must be distinct. References use the same alias syntax. Do not derive aliases or associations automatically from names, branches, UUID similarity or native receipts. Native IDs are private opaque receipts and never belong in this payload; the browser does not establish native identity.

Repository `url` is canonical `https://github.com/OWNER/REPO`; `work.url` and `assignment.work_url` are canonical `https://github.com/OWNER/REPO/issues/POSITIVE_INTEGER`, with no credentials, query, fragment or trailing slash. Repository and Issue ownership must match exactly, and assignment Issue must equal root Issue. `source` is text ≤240 or null. `liveness` recognizes `live`, `exited`, `unknown`; retention `state` recognizes `retained`, `removed`, `unknown`. Unknown strings become unknown; non-string/non-null values reject. Neither idle, success, Completed, release, absence nor time implies liveness or a state transition. Even explicit exit/result grants no Done, acceptance, release or deletion eligibility.

The renderer explicitly labels **association and source as claims from the imported observation**, never cryptographic or authenticated backend truth. Missing bundle/components/references/source show missing/unassociated and suppress a character on the desk and portrait. Duplicate aliases, incompatible references, repository/Issue mismatch, assignment to an exited session or removed workspace, or inconsistent observation times show conflict and suppress pairing. There is no fallback to an arbitrary desk. Null retention does not manufacture retention evidence; session liveness has its own source/time, and root execution result is independent.

Session and assignment observation timestamps must be ≤ office observation time, which must be ≤ root observation time. Inconsistency is a visible conflict. Any timestamp later than browser current time is visibly future/non-current and suppresses pairing. Any of these observations older than **24 hours** is visibly stale/non-current; a historical non-conflicting relation can still be shown as an imported claim. Browser current time only labels age at render; no auto-refresh, state transition or inferred exit occurs. v1 retains its **illustrative-only** character and never gains a fabricated session assignment.

Files remain ≤16 KiB UTF-8. V2 additionally rejects markup delimiters, control characters, backslashes, personal/absolute paths, common native receipt prefixes/UUIDs, secret-like token/key/password/bearer patterns, raw transcript markers and non-GitHub HTTP/file URL schemes. These bounded checks are defense in depth, not a complete secret detector: the Coordinator must manually remove private paths, transcripts, credentials and native IDs before import. All accepted text uses `textContent`; only validated Issue URLs become links, and artwork remains the fixed local skin manifest. No imported HTML/JS or remote resource URL is executed. No fetch, storage, backend access, publication or scheduling is added.

Focused validation: `node prototype/snapshot-v2.test.cjs`, existing `snapshot.test.cjs` and `movement.test.cjs`, and `node --check` for affected JS. Browser acceptance also requires a separately collected real sanitized input, file/HTTP, both skins, conflict/missing non-pairing, mode/import/selection/focus regression and 390px/desktop layouts. Synthetic fixtures alone do not satisfy actual-observation acceptance. DOM keyboard handler/focus checks do not prove native Orca key delivery.

## Issue 28: repository rooms and explicit Project views

Choose **방·Project 보기 · 가상 2개 방** for the fictional Paper/Garden sample.
It contains four fictional records, two repository-owned rooms, a shared cross-repository
Project, and a Paper-only Project. Select Garden + Paper-only for an explicit empty
result. Clearing the Project filter includes both known nonmembers (`[]`) and records
whose memberships are unknown (`null`); unknown memberships never match a Project.
The sample is not live repository data. Existing four-desk, movement, v1 and single-v2
modes retain their original scope; importing one v2 observation still displays one record.

The room selector chooses a repository; its desks never belong to a Project. The
single-select GitHub Project filter uses only explicit canonical URL memberships,
regardless of Project owner, repository name, or branch. It never changes workflow,
assignment, policy, or backend state, and adds no actor travel between rooms. Selection
survives while visible; a filtered-out selection falls back to the first visible record
in input order, or clears all detail/Issue links when empty. Room/filter choices persist
across skin changes and mode visits when valid. A newly selected file retains room, Project, selection and logical desk focus only
while their stable identities still match; unavailable choices reset with an explanation. Filtering preserves each desk's room position and artwork slot.

For manual multi-record input, copy **views-example.json** and use JSON 가져오기;
the UI switches to **방·Project 보기 · 수동 가져오기**. `views-sample.js` defines the
same fictional sample for offline `file://` use. The strict presentation envelope is:

```json
{
  "view_version": 1,
  "source": "Sanitized manual observation provenance",
  "observed_at": "2026-01-01T00:00:00Z",
  "projects": [{"url": "https://github.com/orgs/example/projects/1", "label": "Example"}],
  "records": [{"id": "display-record-1", "observation": "REPLACE with a complete existing v2 object", "projects": null}]
}
```

The string placeholder above is deliberately invalid: use a complete validated v2
observation from the existing format, as in the full example. `projects` on each record
is either `null` (not observed), `[]` (explicitly no memberships), or unique URLs declared
in the envelope's Project catalog. Valid Project URLs are exactly
`https://github.com/orgs/OWNER/projects/NUMBER` or `https://github.com/users/OWNER/projects/NUMBER`.
Membership provenance and observation time are the envelope's source/time; the selected
record retains its own Issue, source/time, workflow, execution, and relation evidence.
Every imported assertion, including source and Project membership, remains an **unverified
manual claim**. Import does not authenticate origin or provide a real multi-repository
observation. Historical input remains historical; there is no automatic refresh.

Bounds: 64 KiB UTF-8 per envelope, 1–8 v2 records (each ≤16 KiB), ≤4 rooms, ≤4 desks per
room, and ≤8 Projects/memberships per record. A room requires explicit v2 repository
and workspace ownership matching the canonical Issue repository. Duplicate record IDs,
Issue URLs, Project URLs, conflicting cross-record repository/workspace/session aliases,
unknown fields/references, and inconsistent envelope time are rejected. Internal v2
session/assignment/time conflicts still use the existing visible non-pairing checks.
The v2 privacy restrictions also cover envelope metadata, labels, and memberships;
relative paths are rejected too. Native receipts/IDs, private paths, credentials,
transcripts and actual observations must never be committed into examples. These
bounded checks remain defense in depth, not source authentication or a complete secret
detector. No packages, fetch, persistence, collection, or control API is added.

Run `node prototype/views.test.cjs` plus the existing snapshot, snapshot-v2, and movement
tests. Browser acceptance covers both skins and file/HTTP, room ownership, shared
Projects, no matches, unknown membership, selection/focus, and 390px/desktop geometry.
DOM keyboard checks verify handlers/focus separately from the known native Orca key
delivery limitation; a native key acknowledgement alone proves no DOM event.

전체 스킨 검증: `node prototype/skins.test.cjs`와 기존 snapshot/v2/views/movement 테스트. 브라우저에서는 누락된 등록과 실제 404, 재시도/복구/이전 이벤트, 모든 모드와 두 방/Project 필터, 상세·선택·포커스 보존을 file/HTTP 및 390px/데스크톱에서 확인합니다.

## Living office (Issue35)

The default **시뮬레이션** skin uses original small human employees, a fixed 10×10 isometric room, four desks in two rows, and a compact scene-first HUD. Illustration and pixel remain selectable. This is a static layout preset, not a tile/pathfinding engine; only the separate fictional movement DEMO walks; there is no economy, growth, furniture editor, storage, collector, or automatic live refresh. All sample employees and observations are fictional.

The HUD counts only the displayed work in the chosen mode/room/Project. It labels the source and observation timestamp from that displayed snapshot or view envelope; DEMO has no invented observation clock. Selected work retains its own Issue, timestamp, execution, Workflow, association and liveness in the detail panel. On mobile the details sit below the room. Artwork owns no hit targets, keyboard focus, logical identity or status. Small status symbols remain visible; nameplates expand for selection/hover/focus.

The registry still accepts scalar `src/width/height/anchor/display/pixelated` descriptors. A skin can optionally provide a bounded `layout` object with four stable slot positions, character offset, portrait frame, hit/ring/nameplate/bubble geometry and movement-DEMO slot/entrance/beside positions. Filtering retains each record's room-owned slot. Layout changes never change entity IDs, room ownership, work or session associations. The movement script still requires a new session/worktree for a new Task and retains the last position when liveness is unknown.

Simulation descriptors use one uniform **2×** display scale:

| Art | Logical frame | Anchor | Display |
| --- | --- | --- | --- |
| Employee | 24×32 | feet/seating (12,30) | 48×64 |
| Desk | 64×48 | desktop center (32,16) | 128×96 |
| Room / front | 440×395 | (0,0) | 880×790 |

An employee descriptor may additionally declare `expressions: {typing: [frame0, frame1], waiting: [...], review: [...]}`. Each local frame is another ordinary scalar descriptor; two or three frames are supported. Missing optional expressions use the existing static art. A declared invalid frame, missing registration or real file-load error shows the normal explicit error/retry UI, without substituting another asset. Late events from replaced slots cannot alter their replacements. SVGs use integer geometry and no external resources or embedded animation.

**표정 재생 / 일시정지** only controls local expressions. Typing requires explicit running/work, a small question cue requires awaiting_input, and paper cues require explicit Review. Failure `!`, cancellation `×`, unknown `?`, and nonactive result `·` stay static; success supplies neither Done nor current activity. V1 actors are illustrations and always static. V2/view replay requires a consistent complete association, explicit live session with source, execution source, and nonfuture observations no older than 24 hours. These are unverified imported claims, never authenticated live activity. Every import and mode entry starts paused. Skin switches preserve the existing play intent and logical focus; absent optional frames remain static. Replay does not alter any snapshot, timestamp, status or assignment.

Reduced motion and hidden documents stop active frame animations and cancel the presentation expiry callback. They resume only if user play intent remains enabled and evidence permits. A single bounded callback exists only while an eligible imported replay is active, to stop it when observation age crosses 24 hours; it observes no backend and changes no data. There is no global animation scheduler. The separate movement DEMO play/next/reset controls still advance only their explicit fictional scenario.

Focused validation: `node prototype/expressions.test.cjs` exercises all expression mappings, conservative missing/conflicting/unknown/future/stale evidence, v1/v2/view/demo/movement, immutable observations, optional frame safety/anchors, and the actual DOM-local controller's pause/hidden/reduced/expiry/timer lifecycle. Existing snapshot, snapshot-v2, views, movement and skins checks still apply. Browser DOM handler/focus tests do not certify native keyboard event delivery.

## Manual refresh file (Issue37 M1)

**파일로 관찰 갱신** opens a fresh file picker on every click. Select a newly
sanitized v1, v2 or view JSON file; **JSON 가져오기** remains available and uses
the same guarded read handler. This reads the newly selected browser File, never
claims to reread a previously selected disk file, and performs no server fetch,
polling, collection, storage or backend writes. The Coordinator supplies private
sanitized observations separately; actual input and native receipts stay outside
tracked files. File names, paths and native read exceptions are never displayed.

The displayed observation time, **마지막 성공 관찰** and **읽기 수락** history,
and **파일 읽기 시도** time/outcome have separate meanings. Success is local format
acceptance of an unverified manual claim, not authentication or current state.
Cancellation keeps the currently displayed data and last-success history, fences
pending completions, and records cancellation. Selecting a file clears previous
data while reading; size/read/abort/parse/future-time failures leave an empty
observation view. Late completions from superseded reads are ignored. Timestamps
older than a previously accepted matching coverage or Work Item are rejected,
even after a failed attempt. Equal observation times are permitted for corrected
manual copies. Historical files remain inspectable with an explicit **오래된 관찰 ·
현재 상태 아님** notice and observation age in the HUD; they cannot animate as current
activity. Nothing silently falls back to an earlier candidate. Last-success history
may therefore describe a prior accepted file while the current display is empty.

Matching canonical room/Project URLs retain the filters. A selected/focused record
retains identity only when record ID, Issue URL, repository URL and workspace alias
all match and it remains visible. Missing or changed identities use the normal
first-visible/empty fallback and explain the reset. Skin stays unchanged. Logical
desk focus is restored when available without stealing focus from another control
used during the read. Every selected import pauses expressions and movement; cancel
alone does not alter playback intent. Everything remains in memory until reload.

Run `node prototype/refresh.test.cjs` for actual production import/picker handlers
with controlled FileReader ordering, cancel/error/abort/size/invalid transitions,
history separation, timestamps, identity/filter/focus/skin retention, changed
identities, and v1/v2/view inputs. Run the existing six focused suites and affected
JavaScript syntax checks as well. Browser checks cover file/HTTP, desktop/390px,
all skins, imported pause and retained views; DOM focus/handler checks do not prove
native Orca input or cross-command state persistence.

## Waypoint movement DEMO (Issue38 M2)

Movement play now follows a short explicit sequence of skin-local waypoints: desk
approach, work, unknown liveness at the last known position, coffee/wait, return,
delivery, explicit exit, then a visually matching **NEW session** at Task B / worktree B.
Coffee and return retain Task A, worktree A and session 1. The new session label and
separate IDs prevent appearance from implying session reuse. Delivery still grants
neither exit nor Done, acceptance, release or deletion eligibility. All facts are
fictional; imported v1/v2/views never receive movement or assignment changes.

The simulation uses its existing room, small staff, desk anchors and hit targets,
plus optional `layout.movementAnchors` for the side/front aisles and right-wall
coffee cabinet. Illustration and pixel use the same script with simple fallback
coordinates. Routes are fixed point lists with distance-weighted interpolation;
there is no pathfinding, random activity, navigation engine or backend observation.
The actor stays below the room foreground, and the simulation desk row occludes
seated staff. No CSS position transition continues after controller cancellation.

The stage counter/reason describes the explicit script; the separate motion line
reports visual progress, frozen position or completed transition. Visual arrival is
not another factual observation. Pause freezes the rendered waypoint position;
Play resumes it. Next stops playback and presents the next stage immediately as an
accessible static equivalent. Reset stops and restores the first session/entrance.
Skin/mode changes and selected imports stop movement. Hidden/reduced-motion handlers
cancel the sole movement callback and block playback while constrained; returning
visible or disabling reduced motion requires explicit Play. Static Next remains
available. Imported expressions continue to start paused.

`node prototype/movement.test.cjs` covers real route/controller/painter and
visibility/reduced handlers with a controlled clock: intermediate positions,
resume, stale callbacks, same-task excursions, unknown freeze, static steps,
reset, identity and simulation anchors. Run it with the other six suites including
manual refresh. Browser DOM checks and iframe viewports exercise production handlers
and responsive CSS; they do not certify native keyboard/OS preference delivery or
cross-command Orca browser state persistence.

## Selected-work evidence (Issue39 M3)

**선택 작업 근거** shows candidate revision, PR Draft/Ready, each CI observation,
review decision and independent validation separately. CI is always a partial,
unattested list: all supplied runs passing does not establish complete or required
CI coverage. Ready and submitted review do not imply approval; an imported approval
or PASS remains a claim. The panel never grants acceptance, merge or Done.

V1 is unchanged. V2 and each v2 record inside a view may optionally add `evidence`;
old files still work. See the **fictional** `views-example.json` / room sample for
ready + CI success + pending review + unknown validation, mixed CI results,
submitted review, mismatched revision and absent evidence. Fixed historical sample
timestamps remain historical, with unknown current state. Examples contain no real
observations, receipts or credentials.

`evidence` is null or an object with optional nullable `candidate`, `pr`, `ci`,
`review`, `validation`. `ci` is null or an array of at most eight observations,
without deduplication. Each nonnull observation requires `revision`, `source`,
`observed_at`, `url`, all nullable. Nonnull revision is exactly 40 lowercase hex
characters; source is at most 160 characters; time uses the existing UTC ISO format.
All noncandidate observations additionally require nullable `state`. Values are:

| Observation | State values | Extra required fields |
| --- | --- | --- |
| PR | `draft`, `ready`, `unknown` | none |
| CI | `success`, `failure`, `pending`, `cancelled`, `unknown` | `label`: null or ≤80 characters |
| Review | `pending`, `submitted`, `approved`, `changes_requested`, `commented`, `unknown` | none |
| Validation | `PASS`, `FAIL`, `NEEDS-WORK`, `unknown` | `independent`: boolean or null |

URLs are null or canonical HTTPS GitHub URLs in the selected Issue's repository.
Candidate uses `/commit/SHA40` matching its revision; PR/review/validation use
`/pull/POSITIVE_INTEGER`; CI uses `/actions/runs/POSITIVE_INTEGER`, optionally
`/job/POSITIVE_INTEGER`, or `/runs/POSITIVE_INTEGER`. No query, fragment, credentials,
foreign repository, arbitrary link or markup is accepted. Source/label descriptions
contain text rather than URLs; put references in `url`. The existing private-data,
duplicate-key, string and 16 KiB v2 / 64 KiB view limits remain in force.

A usable displayed observation needs its own revision, source, time and reference,
a complete candidate, matching exact revision, and nonfuture times within 24 hours
and no later than the selected record's observation time. Missing/incomplete,
mismatched, stale or inconsistent observations show **미확인**, while retaining the
literal historical claim and its separate provenance. Review/validation links must
match a usable PR observation at the same candidate; a contradictory PR revision
also makes the candidate association unknown. Independent validation additionally needs `independent: true`.
These are conservative display labels, not authentication, repository acceptance
policy, native required-check discovery or an approval engine. Validation acceptance
remains unknown even for an independent PASS claim. No collectors, credentials,
backend, external resources, storage or writes are added.

Selection, room/Project filters, empty states, skins and manual refresh use the
existing controller; refresh retains only matching work identities and their newly
supplied candidate-bound evidence, with expressions paused. Failed imports clear
the panel. The browser-only `evidence.browser.test.js` exports
`runOfficeEvidenceTests(appIframe.contentWindow, optionalSanitizedV2)` for an
isolated app iframe at each viewport; it exercises the production parser, real DOM
and file-import handlers without packages. Full provenance expands per row.
Run `node prototype/evidence.test.cjs`, `node prototype/refresh.test.cjs`
and the six earlier suites, plus affected JS syntax checks. Real browser acceptance
also checks production DOM rendering, long labels/empty states, selection, skin and
refresh retention over file/HTTP at 969px and 390px. DOM-driven tests do not prove
native Orca cross-command key/input persistence or OS preference delivery.

### 건물 데모

표시 메뉴의 **건물 데모 · 두 작업실과 라운지**, 또는 `index.html?view=campus`로
고정된 가상 건물을 엽니다. 민트와 블루 작업실은 각각 별개의 가상 저장소를 나타내며,
각 방의 두 책상은 서로 다른 Work Item / worktree / 세션 별칭에 명시적으로 연결됩니다.
직원이나 책상을 클릭하거나 Tab과 Enter / Space로 선택하면 그 연결 근거를 확인할 수
있습니다. 복도와 커피 라운지는 장식이고, 위치·이동·실제 배정을 관찰하거나 추론하지
않습니다. 첫 버전의 네 직원은 정적이며 별도 이동 타이머가 없습니다.

`campus.js`의 가상 소유 관계와 고정 배치, 로컬 `campus-building.svg` /
`campus-front.svg`, 기존 스킨의 책상·직원 아트는 분리되어 있습니다. 세 스킨은 같은
배치와 소유 관계를 사용하며 선택한 스킨의 아트를 작게 표시합니다. 기존 단일 방과
관찰 가져오기 형식은 그대로이고, 알 수 없는 `view` 값은 기본 데모로 열립니다.

추가 검사: `node prototype/campus.test.cjs`. 실제 페이지의 브라우저 검사는
`campus.browser.test.js`를 읽고 `runOfficeCampusTests(window)`를 호출합니다.
이는 스크립트로 입력 이벤트를 주입하는 검사이며 실제 키보드/포인터 입력 증거와는
구분합니다. 기존 `refresh.test.cjs`는 campus 선택 이후 늦게 도착한 파일 콜백도 검사합니다.
