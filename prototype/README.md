# 작은 오피스

`index.html`을 브라우저에서 직접 열면 됩니다. 서버, 설치, 빌드는 필요하지 않습니다.

네 개의 책상을 클릭하거나 Tab으로 이동한 뒤 Enter / Space를 눌러 상세 정보를 확인하세요. 작은 화면에서는 상세 패널이 장면 아래에 배치됩니다. 애니메이션은 사용하지 않습니다.

캐릭터, 작업, 상태는 `sample-data.js`의 고정된 가상 샘플입니다. Nexus / Orca 연동, 실시간 관찰, 실제 Issue, 완료 또는 승인 증거를 제공하지 않습니다. 시스템에 설치된 한국어 글꼴을 사용하며 외부 리소스를 요청하지 않습니다.

## 관찰 사본 가져오기 (v1)

표시 선택에서 데모 / 스냅샷을 전환하거나 JSON 파일을 가져오세요. 한 Work Item은 한 책상이며 나머지는 빈 장식입니다. 캐릭터는 작업의 삽화이고 실제 에이전트 배정의 증거가 아닙니다. GitHub Workflow와 실행 관찰은 별도이며, 실행 성공은 Done·승인·수락·현재 생존을 뜻하지 않습니다. 시각은 UTC로 표시하고 24시간 초과 또는 미래 5분 초과를 경고합니다. 자동 갱신은 없습니다.

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
