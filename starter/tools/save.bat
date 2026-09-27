@echo off
chcp 65001 >nul
cd /d "%~dp0.."
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo 먼저 tools\first-setup.bat 을 실행하세요.
  pause
  exit /b
)

set /p MSG=변경 내용 한 줄 (그냥 엔터=자동):
if "%MSG%"=="" set MSG=update %date% %time%

git add -A
git commit -m "%MSG%"
git push -u origin HEAD
if errorlevel 1 goto FORCE
echo.
echo 저장 + 업로드 완료!
pause
exit /b

:FORCE
echo.
echo 푸시 실패: GitHub와 내 컴퓨터 내용이 달라요 (파일을 지웠거나 다른 곳에서 수정한 경우).
echo 혼자 쓰는 프로젝트라면 내 컴퓨터가 정답이니 덮어써도 돼요.
set /p ANS=내 컴퓨터 내용으로 덮어쓸까요? (y/n):
if /i "%ANS%"=="y" git push -u --force origin HEAD
pause
