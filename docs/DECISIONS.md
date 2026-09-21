# DECISIONS.md — Pointip-Free

한 줄씩 누적. 최신이 위.

## 2026-09-21

- 계정 최대 개수: 5개 → 2개로 변경 (구현 완료)
- 음성 기능(TTS/STT) 전체 보류. 당분간 text-to-text만.
- 저장소 표기 통일: scoutf-genshin (전부 소문자)
- 프로그램명 확정: ScoutF-Genshin (Scout + F(Free))
- 다음 할 일에서 TTS 항목 제거 → Groq 대안, 로딩 메시지, 미션 뱅크, 언어 선택

## 2026-09-20

- 프로그램명: ScoutF-Genshin / 코드명: Pointip-Free / 안내자: 지니(Genie)
- 폴더: 그대로 유지 (정리는 나중)
- Tauri는 프로젝트의 생명. 진행 필수.
- LLM 순서: OpenRouter → Groq → Ollama → BYOK
- GitHub 저장소: https://github.com/oninepa/scoutf-genshin
- 계정 1개 기본, 최대 5개 (탭) ← 09-21에 2개로 변경됨
- 계정별 완전 독립 (UID + 쿠키 + 프로필)
- 프로필 편집 창에서 계정 추가 가능
- 로그인: 이메일 + 비번 (로컬 저장)
- 파싱: 일일 5회 제한, 2시간 간격, 05:00 KST 리셋
- LLM 무료 API: OpenRouter + Groq, 자동 폴백
- TTS: Edge TTS (msedge-tts) ← 09-21에 전체 보류
- 로컬 브레인 + LLM 하이브리드
- 완료 버튼 없음, 파싱 데이터가 진실
- 자동 파싱은 4시간마다 1회 (수동 우선)
- 언어팩: 한 번에 1개만 설치
- LLM 설정: 별도 창
- 프로필 편집: 별도 창
- 창 기능: 투명도, 항상 위, 테두리 없음 (플레이 창만)
- 플레이 창 로딩 메시지: 재미있는 랜덤 문구
