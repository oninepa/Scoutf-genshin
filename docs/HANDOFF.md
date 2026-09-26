HANDOFF — 2026-09-25 (세션 3)

GitHub: https://github.com/oninepa/scoutf-genshin

## 세션 5 (2026-09-26) 완료

### 1. 템플릿 확장 (45 → 100개)

- A. How-to 10개 (캐릭터 키우기, 성유물 파밍, 원석 모으기 등)
- B. 캐릭터별 상태 10개 (queried 변수 활용)
- C. 비교 질문 5개
- D. 이벤트/버전 5개
- E. 원소 반응 5개
- F. 지역/보스 10개
- G. 시스템/설정 5개
- H. 기타 5개

### 2. 용어 풀이 (초보자 이해)

- 캐릭터 관련 11개 템플릿 재작성
  - C1, C2, C6 → "1단계, 2단계, 6단계" + 설명
  - 치확/치피 → "치명타 확률/피해" + 설명
  - 주옵 → "주요 옵션 (모래시계·성배·왕관)"
  - 제련 → "같은 무기 합치기"
  - 호감도 → "캐릭터와 친밀도"
- 원소 반응 5개 재작성
  - 증발 → "불+물 반응"
  - 융해 → "불+얼음 반응"

### 3. Analyzer 개선

- `queried` 변수 추가 (캐릭터 이름 파싱)
- `userInput` 전달 (chat-api.js 2군데)
- `findCharacterByName`, `buildCharacterDetail` export

### 4. chatLocal 로직 개선

- 템플릿 엔진 먼저 시도 → 로컬브레인 fallback
- `skipLLM: true` 반환 (템플릿 매칭 시 LLM 스킵)
- play.ts에서 `skipLLM` 체크 → 간단 빨리 1번만 답변

### 5. Polisher 규칙 완화

- "길이 유지" → "핵심 정보 유지 + 1~2문장 보충"
- AI 상세 답변이 자연스러워짐

### 6. 미션 450개 재작성

- missions.json 새로 작성 (15 카테고리 × 30개)
- "황당한 미션" → "재미있고 현실적"
- missions.enc 재암호화

### 7. 현 상태 대시보드 확장

- task-engine.js: briefing 7줄로 확장
  - 레진, 일일, 파견, 선계, 주간보스, 변환
  - 나선, 선계 레벨, 평판 (지역별)
  - 업적, 캐릭터, 접속일
  - 웨이포인트, 상자, 신의 눈
  - 탐험 포인트 Top 6
- 지금 할 일: 최대 7개
- play.html: "지난 성과" → "현 상태"
- 지역 평판 (몬드2, 리월3, 이나즈마2, 수메르2, 폰타인2)

### 8. 추천 미션 UI

- play.html에 "✨ 추천 미션" 섹션 추가
- server.js: `/mission/random`, `/mission/categories` API
- play.ts: `loadMissions()` 함수, 🔄 버튼

### 9. 채팅 입력 2줄

- `input` → `textarea rows="2"`
- Enter=전송, Shift+Enter=줄바꿈

### 10. 레이아웃

- play-top: max-height 40vh
- play-bottom: min-height 0, overflow hidden
- 채팅창 삐져나감 해결

## 다음 할 일

1. **용어 풀이 나머지** — 성유물, 나선, 파티, 뽑기 (25개)
2. **D. gcsim 몬스터/파티 조언** — spike 폴더 파이프라인 advisor 연결
3. **재미 가이드** — polisher에 게임 재미 요소 부연 추가
4. **Tauri 빌드** — 1차 배포 준비

## 다음 할 일 (2026-09-25 세션 4 기준)

### 순서 확정 (반드시 이 순서로)

1. **모듈화 마무리** — chat-api.js 분리
   · 게임 무관: 1차→2차 흐름, buildSystemPrompt → engine/
   · 원신 전용: UID, analyzer require, buildAISummary, chatAI 시스템 프롬프트, getSuggestions → games/genshin/
   · engine/ 에서 games/ 를 직접 require 하지 않게 (게임 주입 방식)
   · 이유: AI 협업 효율 (다음 세션부터 작업 쉬움)

2. **템플릿 100개 확장** — 현재 45개
   · "방법(how-to)" 질문 (없음)
   · 캐릭터별 상태 (다이루크, 케이아 등)
   · 비교 질문 (A vs B)
   · 이벤트/버전 관련
   · 원소 반응, 파티 시너지
   · 각 지역/보스별

3. **Tauri 빌드 + 1차 배포** (GitHub Releases)
   · `npm run tauri build`
   · `tauri-plugin-updater` 설치
   · GitHub Releases 업로드

4. **서버/사이트/보안 (2차 배포)**
   · Supabase (로그인 + DB)
   · Vercel (사이트)
   · HTTPS, API 인증, Rate limiting
   · GDPR, 이용약관, 개인정보 처리방침
   · 자동 업데이트 (서버)

### 이번 세션 (4) 완료한 것

- polisher.js 수정 (길이 유지, 호칭/톤 주입)
- analyzer.js 수정 (daily.left, Lv.70 필터, 여행자 제외)
- templates.json 수정 ({advice} 4곳 제거, fallback 중복 제거, character_status_generic priority 5→3)
- fallback 메시지 AI 상세 유도
- play.html 창 크기 확대 (height 900)
- play.html 대시보드 압축 (지난 성과 2~3줄, 지금 할일 3줄, 상단 22vh 제한)
- PARKING에 창 크기 확대 (프로필/쿠키/AI연결) 추가

## 다음 할 일 (2026-09-25 세션 4 추가)

### polisher.js 수정 (AI 부연이 틀 안에)

- 문제: "3~5문장으로 늘려라" ↔ "새 정보 추가 금지" 모순
- 문제: templates 답변이 이미 3문장인데 polisher가 더 늘림 → 정보 부풀림
- 문제: "여행자님" 호칭이 게임 무관 engine/ 에 있음 → games/genshin/ 로 이동 (또는 호출 시 주입)
- 문제: 톤 지시("놀리는 유머")가 원신 톤인데 engine/ 에 있음
- 할 일:
  · "늘려라" 제거 → "그대로 유지하거나 다듬어라"
  · 호칭/톤을 인자로 주입 (게임 무관 유지)
  · 숫자/고유명사 보존 규칙 유지

### templates.json 정리 (프롬프트 다양성/정교함)

- 문제: `fallback_default` 중복 (2번)
- 문제: "방법(how-to)" 질문 없음
- 문제: 같은 질문(예: 레진)에 답변 문장이 비슷 (다양성 낮음)
- 할 일:
  · 중복 제거
  · how-to 템플릿 추가
  · variants (같은 질문 다른 답변) 구조 검토
  · 정적 답변(food, fortune) 재검토

### 모듈화 (chat-api.js 분리)

- 문제: chat-api.js 에 게임 무관 로직 + 원신 전용 로직 섞임
- 할 일:
  · 게임 무관: 1차→2차 흐름, buildSystemPrompt, refreshContext → engine/
  · 원신 전용: UID, analyzer, buildAISummary, chatAI 시스템 프롬프트, getSuggestions → games/genshin/
  · engine/ 에서 games/ 를 직접 require 하지 않게 (게임 주입 방식)

## 현재 상태

### 앱 (Tauri)

- 로그인/홈/LLM 설정/프로필/플레이 창 동작
- 계정 최대 2개 (독립 저장)
- 데이터 파싱 (일일 10회, 05:00 KST 리셋)
- 자동 파싱 (30분마다 체크)
- AI 연결 버튼 (홈 하단)

### 챗봇 (2모드)

- ⚡ **간단 빨리** — 템플릿 엔진 (0.01초, LLM 없음)
- 🧠 **AI 상세** — LLM
  - 템플릿 있음 → polisher (다듬기)
  - 템플릿 없음 → fresh (LLM 새 답변)
- Enter = 간단 빨리 / Shift+Enter = AI 상세

### 캐릭터 데이터

- **33명 전체** (Enka 옷장 12명 → genshin 라이브러리 33명)
- **한글 이름 자동** (API `lang="ko-kr"`)
- **성유물 스탯** 정확 계산 (한글/영어 매칭)
- **선계/탐험/통계** 포함

### 템플릿 엔진 (engine/)

- `template-engine.js` — 매칭 + 치환
- `polisher.js` — LLM 다듬기 (새 정보 추가 금지)

### 게임 자산 (advisor/assets/games/genshin/)

- `templates.json` — 46개
- `analyzer.js` — facts → context

### 자산 암호화

- `missions.enc`, `local-brain.enc`, `system.enc`
- `templates.json`은 아직 평문 (내일 암호화 필요)

### 질문 로그

- `advisor/logs/questions_YYYY-MM-DD.jsonl`
- `/chat/local`, `/chat/llm`, `/chat/ai` 호출 시 자동 수집

## 문서 (docs/)

- `GENIE-SYSTEM.md` — 전체 설계
- `GENIE-ARCHITECTURE.md` — 게임 무관 vs 게임별
- `GENIE-PATTERNS.md` — 12개 패턴
- `GENIE-AUTOLEARN.md` — 자동 학습 파이프라인
- `DEPLOY.md` — 배포 로드맵

## 알려진 이슈

1. **"방법(how-to)" 질문** — "나선 하는 법" 같은 질문에 템플릿 없음
   - 예: "나선비경 하는 법" → "별 0개" 답변 (방법 안 알려줌)
2. **buildAISummary 순서** — LLM이 "레진/파견"에 집착
3. **"데히야" 언급** — 다이루크 질문인데 "데히야 성유물 파밍" 언급
4. **Groq 429** — 여전히 발생 (팩트 크면)
5. **`names-ko.js` 잔재** — 삭제했지만 다른 곳에 참조 가능성

## 보류 (당분간 안 함)

- 음성 (TTS/STT)
- Ollama 로컬 LLM
- 언어별 빌드

## 다음 할 일 (우선순위)

1. **`validator.js`** — LLM 답변 검증 (환각 차단)
2. **`event-watcher.js`** — 살아있는 지니 (파견/레진 이벤트)
3. **프로필 UI 확장** — 피드백 설정 (주기/종류/방식)
4. **templates.json 암호화** — `templates.enc`
5. **"방법" 질문 처리** — how-to 템플릿
6. **`buildAISummary` 순서 개선**
7. **템플릿 100개 확장**

## 실행 방법

**터미널 1 (서버):**

```powershell
cd C:\Users\oninepa\anotherwork\Pointip-Free\advisor
node server.js

터미널 2 (Tauri):

cd C:\Users\oninepa\anotherwork\Pointip-Free\desktop\pointip-desktop
npm run tauri dev

환경
Node.js v24

Rust 1.98

Python 3.14

Windows 11

최신 커밋
ac988cc — 캐릭터 확인 + 로그

413485a — polisher + GENIE 문서



HANDOFF — 2026-09-22 (세션 2)

GitHub: https://github.com/oninepa/scoutf-genshin

## 현재 상태

- Tauri 앱 동작 (로그인/홈/LLM설정/프로필/플레이 창)
- 챗봇 동작 (로컬 브레인 + LLM 하이브리드)
  · 1차: 로컬 브레인 즉답
  · 2차: LLM 부연 + 미션 1개 자연스럽게 제안
- 계정 관리 (탭, 최대 2개, 독립 저장)
- 로컬 인증 (이메일+비번)
- 데이터 파싱 (일일 10회, 05:00 KST 리셋)
- 자동 파싱 (30분마다 체크, 2시간 경과 시 실행)
- AI 연결 버튼 (홈 하단, Groq + OpenRouter)
- 플레이 창 (오버레이)
  · 창 이동: 상단 56px 드래그 바
  · 투명도: 4단계 순환
  · 항상 위: 토글
- Groq 모델: `groq/compound-mini` (속도 1.8초)
- 미션 뱅크: 480개 (16 카테고리 × 30)

## 의존성 (advisor)

- package.json: dependencies 0개
- TTS/STT/Ollama 전부 제거 (보류)
- OpenRouter + Groq만 fetch로 직접 호출

## 알려진 이슈

1. OpenRouter 무료 모델 429 빈번 (Groq 우선이라 큰 문제 아님)
2. 개발 로그가 터미널에 계속 찍힘 (배포 전 정리 필요)

## 보류 (당분간 안 함)

- 음성 기능 (TTS/STT) 전체
- Ollama 로컬 LLM
- 언어별 빌드 (방향만 확정, 개발은 나중)

## 다음 할 일 (우선순위)

1. 로그 정리 (개발 로그 끄기 / 로그 레벨)
2. 플레이 창 로딩 메시지 추가 확장
3. 로컬 브레인 답변 다양화
4. 사용자용 문서 (API 발급 안내)
5. 언어별 빌드 구조 설계

## 실행 방법

1. cd advisor
   node server.js

2. cd desktop/pointip-desktop
   npm run tauri dev

## 환경

- Node.js v24
- Rust 1.98
- Python 3.14
- Windows 11

## 다음 세션 첫 메시지 예시

"다음 세션입니다. Pointip-Free 이어서 진행합니다.
GitHub: https://github.com/oninepa/scoutf-genshin

[docs/HANDOFF.md 내용 붙여넣기]"
```
