@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo === GitHub 처음 연결 (프로젝트당 딱 1번) ===
echo 먼저 github.com에서 빈 저장소를 만들고 주소를 복사해 두세요.
echo.

git --version >nul 2>&1
if errorlevel 1 (
  echo Git이 설치되어 있지 않아요. https://git-scm.com 에서 설치 후 다시 실행하세요.
  pause
  exit /b
)

for /f "delims=" %%i in ('git config --global user.name') do set GNAME=%%i
if not defined GNAME (
  set /p GNAME=이름(영문 아무거나):
  set /p GMAIL=이메일(GitHub 가입 이메일):
  git config --global user.name "%GNAME%"
  git config --global user.email "%GMAIL%"
)

git init
git branch -M main
set /p URL=저장소 주소 (예: https://github.com/이름/저장소.git):
git remote remove origin >nul 2>&1
git remote add origin %URL%
git add -A
git commit -m "first commit"
git push -u origin main
if errorlevel 1 goto FORCE
echo.
echo 완료! 앞으로는 save.bat만 실행하면 돼요.
pause
exit /b

:FORCE
echo.
echo 푸시 실패: GitHub 저장소에 이미 다른 내용이 있어요 (README 등).
set /p ANS=내 컴퓨터 내용으로 덮어쓸까요? (y/n):
if /i "%ANS%"=="y" git push -u --force origin main
pause
