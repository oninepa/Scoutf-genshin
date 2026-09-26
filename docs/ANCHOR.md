# ANCHOR.md

새 세션 시작 시 이 파일만 먼저 첨부한다.

## 프로그램 정보

- 프로그램명: ScoutF-Genshin
- 코드명: Pointip-Free (오픈소스, 비상업)
- 유료 라인 (예정): Pointip-Labs
- AI 파트너: 지니 (Genie)
- 페르소나: 게임 중립
- GitHub: https://github.com/oninepa/scoutf-genshin

## 개발 전략

- text_to_text 완성 → 1차 배포 → 이후 음성 패치
- 1앱 = 1게임 독립 배포
- 비상업은 오픈소스, 상용 브랜드와 링크 X
- ScoutF = Scout + F(Free). Pro는 Pointip-Labs 라인.

## LLM 우선순위

1. OpenRouter (무료 자동)
2. Groq (초고속)
3. Ollama (로컬)
4. BYOK (사용자 API)

## 응답 처리

- 로컬 브레인 우선 (규칙 엔진 + 캐시)
- 매칭 실패 시 LLM

## UI 구조 (Tauri)

- 창 1: 로그인
- 창 2: 홈 (설정)
- 창 3: 플레이 (오버레이)
- 창 4: 프로필 편집
- 창 5: LLM 설정

## 계정

- 탭 기반, 각 UID 독립
- 최대 2개 (계정 1 기본 + 계정 2 추가)
- 계정 1은 .env 자동 이관

## 음성 (보류)

- TTS/STT 전부 보류. 현재는 text-to-text만.
- 추후 패치 시 재검토.

## 기술 스택

- UI: Tauri v2
- 백엔드: Node.js
- 데이터: Enka API, HoYoLab, gcsim
- 라이선스: MIT/Apache만

## 작업 방식

- 한 세션 = 한 주제
- 결정은 DECISIONS.md
- 새 아이디어는 PARKING.md

## 모듈화 원칙 (2026-09-25 추가)

### 취지

- 이 프로그램을 "원신 전용"으로 끝내지 않음
- 다른 게임(LoL, 발로란트 등)에도 적용 가능하게
- 출발은 이미 원신으로 했으므로, 처음부터 다시 만들지 않음

### 방법

- 원신을 개발하면서 동시에 모듈화를 조금씩 진행
- 원신 게임 부분을 분리해서 배치 가능하게 만듦
- 다른 게임은 모듈화(엔진)만 가져가서 적용
- 이 원칙을 문서로 남김

### 원칙

- 원신 기능 개발이 우선 (모듈화 때문에 원신이 늦어지면 안 됨)
- "되돌아가서 다시 만들기"가 아니라 "앞으로 나가면서 분리"
- engine/ (게임 무관) 과 games/genshin/ (게임별) 의 경계를 지킴
- 새 게임 추가 시 engine/ 수정 없이 games/{게임}/ 만 추가되게

### 현재 상태

- engine/: template-engine.js, polisher.js
- games/genshin/: templates.json, analyzer.js
- 앞으로 validator.js 등도 engine/ 에 (게임 무관)

### 배포

- 1앱 = 1게임 독립 배포 (기존 전략 유지)
- 같은 엔진, 다른 config/자산
