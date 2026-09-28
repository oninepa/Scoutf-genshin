\# PARKING.md — Pointip-Free

## enemies.json 보충 작업 (2026-09-27 백로그)

### 현재 상태

- 총 437개 (HoYoWiki API 자동 수집)
- 분류:
  - unknown: 403 (수동 분류 필요)
  - elite: 7
  - world_boss: 14
  - weekly_boss: 6
  - common: 7
- 문제: 대부분 `type: unknown`, `hp: 0`, `region: unknown`, `resistances` 기본값

### 남은 작업 (우선순위)

**1순위: 주간 보스 + 필드 보스 HP/저항 정확값**

- 대상: weekly_boss 6개 + world_boss 14개 = 20개
- 소스: 玉衡杯数据库, Biligame Wiki, GenshinData
- 방법: 웹 스크래핑 또는 수동 입력

**2순위: 정예(elite) 몬스터 확장**

- 대상: 폐허 계열, 심연 계열, 사냥개 등
- 약 30개

**3순위: unknown 403개 자동 분류**

- 이름 패턴으로 분류 (예: "슬라임" → common, "폐허" → elite)
- 또는 玉衡杯 분류 데이터 매칭

**4순위: 자동 업데이트 파이프라인**

- 패치마다 신규 적 감지
- HoYoWiki API 재실행 (scrape-enemies.js)
- 신규 항목만 수동 보충 알림

### 소스 조사 결과 (저장)

- **玉衡杯数据库** — HP/저항 상세, 버전별 업데이트
- **Biligame Wiki** — 몬스터 저항력 표, 페이즈별 저항
- **HoYoWiki API** (`@gonetone/hoyowiki-api`) — 적 목록 (한국어), HP/저항 없음
- **Dimbreath/GenshinData** — 게임 원본 데이터 (MonsterExcel)
- **genshin-calc-data (Rust)** — 적별 원소 저항 상수 (AZHDAHA 등)

### 실행 명령어

```powershell
cd C:\Users\oninepa\anotherwork\Pointip-Free\spike
node scrape-enemies.js



보류 아이디어. 지금 당장 하지 않음. 나중에 하나씩 검토.

- **창 크기 확대** (프로필 편집, 쿠키 설정, AI 연결)
  · play.html 창은 완료 (height 900, 상단 22vh 제한)
  · 프로필 편집 창 — 저장 버튼이 안 보임
  · 쿠키 설정 창 — 아래가 잘림
  · AI 연결(LLM 설정) 창 — 스크롤 필요
  · 공통: height 900+ 또는 내용에 맞춰 자동

\## UI / 기능

\- 계정 2

\- 자동 업데이트

\- 배너 광고 (원신 공지 fetch)

\- 로그 창 분리 (개발자용)

\
\## 계정 / 보안

\- 로그인: 구글 OAuth (Supabase)

\- 이메일 수집 (광고, 알림)

\- 쿠키 자동 감지 (브라우저)

\- 원격 킬 스위치 (서버 응답 중단)

\- 계정 2 추가 경고문 + 정책 체크

\- 컴플라이언스 JSON (게임별 정책)

\## 데이터 / 아키텍처

\- 아키텍처 재편 (모듈형, core + games)

\- 게임 추가 (붕괴, ZZZ, 명조)

\- gcsim 자동 실행

\- 6주 시즌 자동 파싱

\- 용어 사전 (게임·유저 속어)

\- 시스템 DB (Q\&A 미리 준비)

\- 준비 LLM (오프라인 Q\&A 생성)

\## 게임 / 사업

\- LoL 모듈 (Pointip-Labs)

\- 라이엇 개발자 포털 등록

\- Overwolf 등록

\- Discord 채널 (Naviscout)

\- 후원 (Ko-fi, 커피값)

\- 유료 라인 (Pointip-Labs) 설립

\- 프랑스 법인 (SASU)

\## 문서

\- ANCHOR v2 (게임 중립)

\- 각 게임별 매뉴얼

\- API 문서 (서버 엔드포인트)

## 기능 (추가)

- **파싱 로그 리셋 버튼** (개발/긴급용)
  · 매번 `cache/parse_log.json` 수동 삭제 불편
  · UI에 "리셋" 버튼 추가

- **모든 캐릭터 가져오기** (중요)
  · 지금은 옷장 12명만 파싱됨
  · `data-pipeline`에서 `good`으로 전체 캐릭터 조회 필요
  · 원래 이게 기본이었는데 빠짐
```
