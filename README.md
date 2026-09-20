Genshin-ScoutF



원신을 위한 AI 도우미. Pointip-Free 프로젝트의 코드명.





정체성

\------

프로그램명        Genshin-ScoutF

코드명            Pointip-Free

유료 라인 (예정)  Pointip-Labs

AI 파트너         지니 (Genie)

페르소나          게임 중립 (특정 게임 세계관 고정 X)

언어              한국어 (기본)

라이선스          MIT / Apache 2.0 (상업용 안전)





개요

\----

\- 게임 위에 얹는 오버레이 AI 코치

\- 화면 캡처가 아니라 공식 API·파싱 데이터 사용

\- 초기 버전: 텍스트 입력 → 텍스트 출력

\- 음성·하이브리드는 이후 패치





기술 스택

\---------

오버레이 UI     Tauri (v2)

LLM             Groq + OpenRouter (자동 폴백) + Ollama (로컬)

TTS             Edge TTS (msedge-tts, MIT)

STT (예정)      nodejs-whisper (MIT)

데이터          Enka API, HoYoLab, gcsim

언어            Node.js (백엔드), TypeScript (Tauri), Python (데이터 파이프라인)





폴더 구조

\---------

Pointip-Free/

&#x20; advisor/          Node.js 백엔드 (챗봇, LLM, TTS, 계정 관리)

&#x20; data-pipeline/    데이터 수집 (Enka, HoYoLab)

&#x20; spike/            gcsim 시뮬레이션

&#x20; desktop/          Tauri 데스크톱 UI

&#x20;   pointip-desktop/

&#x20; docs/             문서 (ANCHOR, DECISIONS, PARKING)

&#x20; README.md





실행 방법

\---------



1\. 백엔드 서버 (필수)

&#x20;  cd advisor

&#x20;  node server.js



2\. Tauri UI

&#x20;  cd desktop/pointip-desktop

&#x20;  npm run tauri dev



3\. 데이터 파이프라인 (수동)

&#x20;  cd data-pipeline

&#x20;  python fetch-hoyolab.py





환경 요구사항

\-------------

\- Node.js v20+

\- Rust 1.80+

\- Python 3.10+ (데이터 파이프라인)

\- Windows 10/11





라이선스

\--------

MIT

