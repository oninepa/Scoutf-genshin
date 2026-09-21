ScoutF-Genshin

원신을 위한 AI 도우미. Pointip-Free 프로젝트의 코드명.

## 정체성

프로그램명 ScoutF-Genshin
코드명 Pointip-Free
유료 라인 (예정) Pointip-Labs
AI 파트너 지니 (Genie)
페르소나 게임 중립 (특정 게임 세계관 고정 X)
언어 한국어 (기본)
라이선스 MIT / Apache 2.0 (상업용 안전)

※ ScoutF = Scout + F(Free). Pro 라인은 Pointip-Labs에서 별도.

## 개요

- 게임 위에 얹는 오버레이 AI 코치
- 화면 캡처가 아니라 공식 API·파싱 데이터 사용
- 현재 버전: 텍스트 입력 → 텍스트 출력
- 음성(TTS/STT)은 전부 보류. 추후 패치.

## 기술 스택

오버레이 UI Tauri (v2)
LLM OpenRouter → Groq → Ollama (자동 폴백)
데이터 Enka API, HoYoLab, gcsim
언어 Node.js (백엔드), TypeScript (Tauri), Python (데이터 파이프라인)

보류 중 (추후)
TTS (보류)
STT (보류)

## 폴더 구조

scoutf-genshin/
advisor/ Node.js 백엔드 (챗봇, LLM, 계정 관리)
data-pipeline/ 데이터 수집 (Enka, HoYoLab)
spike/ gcsim 시뮬레이션
desktop/ Tauri 데스크톱 UI
pointip-desktop/
docs/ 문서 (ANCHOR, DECISIONS, PARKING, HANDOFF)
README.md

## 실행 방법

1. 백엔드 서버 (필수)
   cd advisor
   node server.js

2. Tauri UI
   cd desktop/pointip-desktop
   npm run tauri dev

3. 데이터 파이프라인 (수동)
   cd data-pipeline
   python fetch-hoyolab.py

## 환경 요구사항

- Node.js v20+
- Rust 1.80+
- Python 3.10+ (데이터 파이프라인)
- Windows 10/11

## 라이선스

MIT
