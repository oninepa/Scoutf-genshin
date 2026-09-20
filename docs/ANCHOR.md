\# ANCHOR.md



새 세션 시작 시 이 파일만 먼저 첨부한다.



\## 프로그램 정보

\- 프로그램명: Genshin-ScoutF

\- 코드명: Pointip-Free (오픈소스, 비상업)

\- 유료 라인 (예정): Pointip-Labs

\- AI 파트너: 지니 (Genie)

\- 페르소나: 게임 중립



\## 개발 전략

\- text\_to\_text 완성 → 1차 배포 → 이후 음성 패치

\- 1앱 = 1게임 독립 배포

\- 비상업은 오픈소스, 상용 브랜드와 링크 X

\- GitHub: https://github.com/oninepa/genshin-scoutf



\## LLM 우선순위

1\. OpenRouter (무료 자동)

2\. Groq (초고속)

3\. Ollama (로컬)

4\. BYOK (사용자 API)



\## 응답 처리

\- 로컬 브레인 우선 (규칙 엔진 + 캐시)

\- 매칭 실패 시 LLM



\## UI 구조 (Tauri)

\- 창 1: 로그인

\- 창 2: 홈 (설정)

\- 창 3: 플레이 (오버레이)

\- 창 4: 프로필 편집

\- 창 5: LLM 설정



\## 계정

\- 탭 기반, 각 UID 독립

\- 계정 1은 .env 자동 이관



\## 기술 스택

\- UI: Tauri v2

\- 백엔드: Node.js

\- TTS: Edge TTS (msedge-tts, MIT)

\- 데이터: Enka API, HoYoLab, gcsim

\- 라이선스: MIT/Apache만



\## 작업 방식

\- 한 세션 = 한 주제

\- 결정은 DECISIONS.md

\- 새 아이디어는 PARKING.md

