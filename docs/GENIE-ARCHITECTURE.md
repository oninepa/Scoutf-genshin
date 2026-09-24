# 지니 아키텍처

## 레이어

1. 게임 무관 엔진 (engine/)
2. 게임별 플러그인 (games/{게임}/)
3. 사용자 설정 (프로필)
4. 배포 채널 (모드별)

## 게임 추가 방법

1. games/{게임}/ 폴더 생성
2. parser.js (API)
3. analyzer.js (facts → context)
4. templates.json (템플릿)
5. events.js (이벤트)
6. config.json (설정)
7. 끝. engine/ 변경 없음.

## 모드

- 원신: normal
- LoL: practice, ranked, pro
- 발로란트: unrated, competitive

## 배포

- 같은 엔진, 다른 config
- 모드별 별도 빌드
- 서버에서 자산만 갱신
