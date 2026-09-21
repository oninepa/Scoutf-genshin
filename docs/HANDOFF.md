HANDOFF — 2026-09-21



GitHub: https://github.com/oninepa/Scoutf-genshin

현재 상태

\---------

\- Tauri 앱 동작 (로그인/홈/LLM설정/프로필/플레이 창)

\- 챗봇 동작 (로컬 브레인 + LLM 하이브리드)

\- 계정 관리 동작 (탭 1개 기본, 계정 2 추가 가능)

\- 로컬 인증 (이메일+비번) 동작

\- 데이터 파싱 (일일 5회 제한, 2시간 간격, 05:00 KST 리셋)

\- GitHub 업로드 완료


알려진 이슈

\-----------

1\. LLM 응답 지연 (Groq 429 빈번, OpenRouter 폴백 느림)

2\. TTS 긴 문장 실패 (Edge TTS - Stream closed)

3\. 플레이 창 로딩 메시지 랜덤화 미완

4\. docs/HANDOFF.md 이외 문서 최신화 필요

다음 할 일 (우선순위)

\---------------------

1\. TTS 문장 단위 스트리밍

2\. Groq 무료 모델 대안 확인

3\. 플레이 창 로딩 메시지 재미 요소

4\. 미션 뱅크 확장

5\. 언어 선택 시스템


실행 방법

\---------

1\. cd advisor

&#x20;  node server.js


2\. cd desktop/pointip-desktop

&#x20;  npm run tauri dev

환경

\----

\- Node.js v24

\- Rust 1.98

\- Python 3.14

\- Windows 11


다음 세션 첫 메시지 예시

\------------------------

"다음 세션입니다. Pointip-Free 이어서 진행합니다.

GitHub: https://github.com/oninepa/Scoutf-genshin



\[docs/HANDOFF.md 내용 붙여넣기]



다음 할 일: 1) TTS 문장 단위 스트리밍"

