HANDOFF — 2026-09-21

GitHub: https://github.com/oninepa/scoutf-genshin

## 현재 상태

- Tauri 앱 동작 (로그인/홈/LLM설정/프로필/플레이 창)
- 챗봇 동작 (로컬 브레인 + LLM 하이브리드)
- 계정 관리 동작 (탭, 최대 2개)
- 로컬 인증 (이메일+비번) 동작
- 데이터 파싱 (일일 5회 제한, 2시간 간격, 05:00 KST 리셋)
- GitHub 업로드 완료

## 알려진 이슈

1. LLM 응답 지연 (Groq 429 빈번, OpenRouter 폴백 느림)
2. 플레이 창 로딩 메시지 랜덤화 미완
3. docs 문서 최신화 진행 중

## 보류 (당분간 안 함)

- 음성 기능 (TTS/STT) 전체

## 다음 할 일 (우선순위)

1. Groq 무료 모델 대안 확인
2. 플레이 창 로딩 메시지 재미 요소
3. 미션 뱅크 확장
4. 언어 선택 시스템

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
