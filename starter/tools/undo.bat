@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo === 마지막 저장(커밋) 상태로 되돌리기 ===
echo 저장 안 한 수정은 전부 사라져요.
set /p ANS=정말 되돌릴까요? (y/n):
if /i "%ANS%"=="y" (
  git reset --hard HEAD
  git clean -fd
  echo 되돌렸어요.
)
pause
