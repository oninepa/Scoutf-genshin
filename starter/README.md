# 스타터 사용법 (전체 흐름)

1. **아이디어**: Opus(또는 무료 AI)와 대화 -> docs/13-prompts.md 프롬프트 1로 정리
2. **문서 채우기**: Sonnet에게 프롬프트 2로 PROJECT.md, docs/01~05를 채우게 한다
3. **폴더 만들기**: 프로젝트 이름 폴더를 만들고 이 스타터 전체 + 채운 문서를 넣는다
4. **GitHub**: github.com에서 빈 저장소를 만들고 tools\first-setup.bat 실행 (1번만)
5. **에이전트 확인**: Claude Code 등에서 프롬프트 3 (읽고 요약만, 수정 금지)
6. **구현**: 프롬프트 4를 태스크 번호만 바꿔 반복. 매번 tools\save.bat
7. **검사**: 프롬프트 5(보고서만) -> 확인 -> 프롬프트 6(수정)
8. **배포**: 프롬프트 7. docs/12-release.md 순서, tools\build-release.bat 사용

망가지면 tools\undo.bat. 모델을 바꿀 때는 docs/11-handoff.md.
