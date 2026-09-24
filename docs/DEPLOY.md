공격자가 GitHub 뒤져도 껍데기(코드)만. 자산은 서버.

### 한계

앱 자체엔 복호화 키가 있음 → 완벽 방어 불가 (근본 한계). 하지만 다른 사용자에게 피해는 없음.

---

## 서버 (무료 티어)

| 서비스             | 무료 티어          | 용도         |
| ------------------ | ------------------ | ------------ |
| Vercel             | 넉넉               | 웹사이트/API |
| Cloudflare Workers | 넉넉               | API          |
| Supabase           | 500MB DB, 5만 유저 | 로그인, DB   |
| Fly.io             | 소규모             | 서버         |
| Render             | 750시간/월         | 서버         |

**추천**: Supabase (로그인+DB) + Vercel (웹/API)

---

## GitHub 보안

| 항목                           | 상태                     |
| ------------------------------ | ------------------------ |
| API 키 (config.json)           | ✅ gitignore             |
| 쿠키 (accounts/\*/cookie.txt)  | ✅ gitignore             |
| auth (session.json, user.json) | ✅ gitignore             |
| 소스 코드 (전체)               | ⚠️ 공개 (오픈소스라 OK)  |
| 미션/프롬프트                  | ⚠️ 공개 → 자산 분리 대상 |

**자산 분리 대상:**

- `advisor/missions.json`
- `advisor/local-brain/`
- `advisor/chat-api.js`의 시스템 프롬프트 (코드에서 분리)

---

## 보안 (배포 시 필수)

| 항목              | 이유                      |
| ----------------- | ------------------------- |
| HTTPS             | 서버 통신 암호화          |
| API 인증          | 서버 API 아무나 못 부르게 |
| Rate limiting     | 남용 방지                 |
| 개인정보 처리방침 | GDPR (프랑스)             |
| 이용약관          | 법적 보호                 |
| 에러 로깅         | Sentry 등                 |

---

## 로드맵 (단계별)

### 1단계: 자산 분리

- `missions.json`, `local-brain/`, 시스템 프롬프트를 `advisor/assets/`로 이동
- `.gitignore`에 추가 → 로컬에만 존재

### 2단계: 암호화

- AES-256-GCM (Node.js `crypto` 내장)
- 스크립트: "암호화 → 파일 생성"

### 3단계: 복호화

- 앱 시작 시 암호화 파일 읽어서 복호화
- 메모리에만 올림
- 키: `.env` (배포 땐 서버 or 난독화)

### 4단계: 서버 배포

- 자산을 서버에서 받아오기
- Supabase Storage 또는 Cloudflare R2 (무료)

### 5단계: 인증 + Rate limit

- 앱 → 서버 요청 시 토큰
- 남용 방지

### 6단계: Tauri 빌드 + 자동 업데이트

- `npm run tauri build`
- `tauri-plugin-updater` 설치
- GitHub Releases 연동

### 7단계: 사용자 문서

- 설치 방법
- Groq/OpenRouter 키 발급 안내
- 첫 실행 가이드

---

## 1차 배포 (GitHub Releases) 절차

1. Tauri 빌드 (`npm run tauri build`)
2. `.msi` / `.exe` 생성됨
3. `tauri-plugin-updater` 설정 (서명 키 생성)
4. GitHub Releases에 업로드
5. 사용자 다운로드 → 실행
6. 새 버전 올리면 자동 업데이트 알림

---

## 2차 배포 (자체 서버) 절차

1. Supabase 프로젝트 생성 (로그인 + DB)
2. Vercel에 웹사이트 배포
3. 개인정보 처리방침 + 이용약관 작성
4. 설치 파일 서버 업로드
5. 앱에 서버 URL + 버전 체크 로직
6. GDPR 동의 UI

---

## 주의: "감시" 표현

"감시"라는 표현은 법적으로 위험. 목적을 명확히 해야 함:

- 사용 통계 (어떤 기능 많이 쓰나)
- 버그 리포트
- 업데이트 알림

개별 사용자 활동 추적은 GDPR에서 강한 제약.
