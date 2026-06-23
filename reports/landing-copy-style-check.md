# Landing Copy Style Check

## Agentic Run Packet

- Mode: copy-pass
- User goal: 랜딩페이지 카피라이트 문체 점검
- Target file: `src/components/landing-page.tsx`
- Assumption: 여기서 `카피라이트`는 법적 copyright 검토가 아니라 landing copywriting 문체 점검으로 해석했다.
- Current status: complete
- Next action: 선택한 대체 문안을 실제 컴포넌트에 반영

## One-Line Verdict

현재 카피는 기능 설명으로는 명확하지만, 제품 PR 문장으로는 다소 차분하고 반복적이다. 핵심 메시지는 `읽던 자리`, `붙잡은 구절`, `다음 공부`로 좋으니, hero와 섹션 제목은 더 짧고 선명한 제품 약속으로 바꾸는 편이 낫다.

## Copy Score

- Score: 4 / 5
- Reason: 대상, 문제, 기능, CTA는 명확하다. 다만 `흐름`, `남기다`, `이어가다`가 반복되어 문장 밀도가 낮아지고, 일부 섹션명이 내부 기획어처럼 보인다.

## Style Diagnosis

| Area | Current Tone | Issue | Direction |
| --- | --- | --- | --- |
| Hero | 차분한 설명형 | 제품 약속은 좋지만 첫 인상이 약하다 | 짧은 약속 + 구체 기능 |
| Problem | 공감형 | 문장은 자연스럽지만 흔한 표현 | 흩어지는 기록의 장면을 더 구체화 |
| App preview | 설명형 | `실제 앱 UI`는 내부 검수어 느낌 | 사용자가 얻는 화면 경험으로 표현 |
| Benefits | 기능 나열형 | 각 기능은 맞지만 PR 리듬이 약함 | 기능명보다 결과 중심 제목 |
| Workflow | 반복형 | `이어가다`, `흐름` 반복 | 단계별 동사를 다르게 배치 |
| CTA | 명확함 | 무난하지만 기억에 남는 문장은 아님 | 마지막 약속을 한 번 더 압축 |

## Repetition Check

반복이 많은 어휘:

- `흐름`
- `남기다`
- `이어가다`
- `구절`
- `읽던 자리`

유지할 핵심 단어:

- `KJV`
- `리더노트`
- `읽던 자리`
- `붙잡은 구절`
- `인용 보관`
- `통독률`

줄일 단어:

- `흐름`: hero, problem, benefits, workflow, final CTA에 반복됨
- `남기다`: 기능 설명에는 맞지만 감정적 설득력이 약함
- `TTS`: 기능 chip에서는 가능하지만 본문에서는 `듣기`가 더 자연스러움

## Recommended Message Map

| Element | Recommended Copy |
| --- | --- |
| One-liner | KJV 성경을 읽던 자리와 붙잡은 구절을 한곳에 정리하는 개인 리더노트 |
| Core promise | 오늘 읽은 말씀이 다음 공부로 바로 이어진다 |
| Proof | 실제 앱 화면: 이어 읽기, 통독률, 하이라이트, 인용 보관, 듣기 |
| CTA | 내 리더노트 시작하기 |
| Trust note | KJV 본문은 CrossWire KJV 모듈 기반으로 제공합니다. |

## Suggested Copy Rewrite

### Hero

Current:

> 읽던 자리로 돌아오고, 붙잡은 구절은 남겨두세요.

Recommended:

> 읽던 자리와 붙잡은 구절을 한 리더노트에.

Support copy:

> KJV 성경 통독, 하이라이트, 메모, 인용 보관을 한 화면의 공부 기록으로 이어주는 개인 성경 리더입니다.

Why:

- `돌아오고 / 남겨두세요`보다 명사 구조가 선명하다.
- `한 리더노트에`가 제품명을 자연스럽게 받쳐준다.

### Problem

Current:

> 성경을 읽다 보면 기록은 금방 흩어집니다.

Recommended:

> 읽은 위치와 붙잡은 말씀은 따로 두면 금방 잊힙니다.

Body:

> 어디까지 읽었는지, 어떤 구절을 표시했는지, 다시 인용하려던 말씀이 어디 있었는지. KJV 리더노트는 읽기와 기록을 같은 자리에서 정리합니다.

Why:

- `기록이 흩어진다`보다 상황이 더 구체적이다.
- `한곳에 남깁니다` 반복을 줄인다.

### App Preview

Current:

> 홈에서 읽기로, 읽기에서 인용 보관으로 이어집니다.

Recommended:

> 홈에서 바로 읽고, 읽는 자리에서 바로 보관합니다.

Body:

> 마지막 위치는 홈에서 확인하고, 리더에서는 구절을 표시하거나 메모합니다. 다시 쓸 말씀은 인용 보관함에서 바로 꺼냅니다.

Why:

- 실제 사용 행동이 더 빠르게 읽힌다.
- `이어집니다` 반복을 줄인다.

### Benefits

Current:

> 성경 공부의 흐름을 끊지 않도록 필요한 기능만 한곳에 모았습니다.

Recommended:

> 매일 읽고, 표시하고, 다시 찾는 일에 집중했습니다.

Benefit title rewrites:

| Current | Recommended |
| --- | --- |
| 다시 시작할 곳을 찾느라 멈추지 않습니다. | 마지막으로 읽은 장에서 바로 시작합니다. |
| 통독이 감이 아니라 기록으로 보입니다. | 통독률을 숫자로 확인합니다. |
| 지나가면 잊히는 구절을 붙잡아 둡니다. | 중요한 구절은 표시와 메모로 남깁니다. |
| 다시 쓸 구절을 따로 찾지 않아도 됩니다. | 다시 인용할 말씀을 따로 모아둡니다. |
| 읽기 어려운 시간에도 흐름을 이어갑니다. | 읽기 어려운 순간에는 듣기로 따라갑니다. |

### Workflow

Current:

> 오늘의 읽기가 다음 공부로 이어집니다.

Recommended:

> 오늘의 읽기가 내일의 기록이 됩니다.

Step rewrites:

| Current | Recommended |
| --- | --- |
| 오늘 읽을 자리로 돌아가기 | 마지막 위치에서 시작 |
| 읽다가 붙잡은 구절 남기기 | 구절 표시와 메모 |
| 다시 들으며 흐름 확인하기 | 선택한 말씀 듣기 |
| 다음 공부로 이어가기 | 기록에서 다시 열기 |

### Final CTA

Current:

> 오늘 읽은 말씀이 흩어지지 않게.

Recommended:

> 오늘 붙잡은 말씀을 다음 공부까지 가져가세요.

Body:

> 읽던 위치, 표시한 구절, 다시 쓸 인용을 내 리더노트에 정리하고 바로 이어 읽으세요.

## Keep / Change

### Keep

- `KJV 리더노트`
- `내 리더노트 시작하기`
- `계정 만들기`
- `내 리더노트 열기`
- `읽던 자리`
- `붙잡은 구절`

### Change

- `실제 앱 UI` -> `앱 화면`
- `문제` -> `왜 필요한가`
- `핵심 이점` -> `읽기와 기록`
- `공부 흐름` -> `사용 흐름`
- `TTS 듣기` -> `말씀 듣기`

## Copyright/Trust Copy Note

법적 권리 검토 문체로는 과하게 방어적인 문장을 넣지 않는 편이 좋다. 랜딩 하단 또는 preview 근처에 짧게만 둔다.

Recommended:

> KJV 본문은 CrossWire KJV 모듈 기반으로 제공합니다.

If public release scope includes regional rights review:

> KJV 본문은 CrossWire KJV 모듈 기반으로 제공하며, 지역별 배포 및 인용 권리는 출시 범위에 맞춰 확인합니다.

## Final Recommended Landing Copy Set

```text
Eyebrow:
KJV 성경 통독과 구절 기록

Hero:
KJV 리더노트

Punch:
읽던 자리와 붙잡은 구절을 한 리더노트에.

Hero body:
KJV 성경 통독, 하이라이트, 메모, 인용 보관을 한 화면의 공부 기록으로 이어주는 개인 성경 리더입니다.

Proof chips:
마지막 위치 기억 / 통독률 확인 / 구절 하이라이트 / 인용 보관 / 말씀 듣기

Problem heading:
읽은 위치와 붙잡은 말씀은 따로 두면 금방 잊힙니다.

Problem body:
어디까지 읽었는지, 어떤 구절을 표시했는지, 다시 인용하려던 말씀이 어디 있었는지. KJV 리더노트는 읽기와 기록을 같은 자리에서 정리합니다.

Preview heading:
홈에서 바로 읽고, 읽는 자리에서 바로 보관합니다.

Preview body:
마지막 위치는 홈에서 확인하고, 리더에서는 구절을 표시하거나 메모합니다. 다시 쓸 말씀은 인용 보관함에서 바로 꺼냅니다.

Benefits heading:
매일 읽고, 표시하고, 다시 찾는 일에 집중했습니다.

Workflow heading:
오늘의 읽기가 내일의 기록이 됩니다.

Final CTA heading:
오늘 붙잡은 말씀을 다음 공부까지 가져가세요.

Final CTA body:
읽던 위치, 표시한 구절, 다시 쓸 인용을 내 리더노트에 정리하고 바로 이어 읽으세요.

Trust note:
KJV 본문은 CrossWire KJV 모듈 기반으로 제공합니다.
```
