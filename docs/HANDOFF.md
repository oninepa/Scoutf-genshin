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
