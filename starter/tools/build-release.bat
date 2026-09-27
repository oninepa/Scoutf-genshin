@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set OUT=release-out
set /p VER=<VERSION

echo === 배포 폴더 만들기 (버전 %VER%) ===
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"

if not exist release.allow (
  echo release.allow 파일이 없어요.
  goto FAIL
)

for /f "usebackq eol=# delims=" %%L in ("release.allow") do call :COPYONE "%%L"

echo.
echo === 검사 1: 넣으면 안 되는 파일 ===
dir /s /b /a "%OUT%" | findstr /i /r "\\\.env \\CLAUDE\.md \\STATE\.md \\INDEX\.md \\PROJECT\.md \\DECISIONS\.md \\docs\\ \\tools\\ \\\.git\\ \\prompts\\ \\secrets" >nul
if not errorlevel 1 (
  echo [실패] 배포 폴더에 개발용 파일이 섞였어요. 아래 목록을 release.allow에서 빼세요.
  dir /s /b /a "%OUT%" | findstr /i /r "\\\.env \\CLAUDE\.md \\STATE\.md \\INDEX\.md \\PROJECT\.md \\DECISIONS\.md \\docs\\ \\tools\\ \\\.git\\ \\prompts\\ \\secrets"
  goto FAIL
)
echo 통과

echo.
echo === 검사 2: 키/비밀값 노출 ===
findstr /s /m /i /r /c:"sk-ant-" /c:"sk-[a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9][a-z0-9]" /c:"AIza" /c:"ghp_" /c:"BEGIN .*PRIVATE KEY" /c:"api[_-]key *[:=]" /c:"secret *[:=]" "%OUT%\*" 2>nul
if not errorlevel 1 (
  echo [실패] 위 파일에 키처럼 보이는 문자열이 있어요. 서버로 옮기거나 지우세요.
  goto FAIL
)
echo 통과

echo.
echo === 검사 3: 라이선스 파일 ===
if not exist "%OUT%\licenses.txt" echo [경고] licenses.txt가 없어요. 가져다 쓴 오픈소스의 출처 표기를 넣어 두세요.

> "%OUT%\version.json" echo {"version":"%VER%","date":"%date%"}

echo.
echo === 완료: %OUT% 폴더가 배포용이에요 ===
echo 이 폴더 안의 내용만 호스팅/공개 저장소에 올리세요.
pause
exit /b 0

:FAIL
echo.
echo === 배포 중단 ===
pause
exit /b 1

:COPYONE
set "P=%~1"
if exist "%P%\" (
  robocopy "%P%" "%OUT%\%P%" /E /XF *.map >nul
  exit /b 0
)
if exist "%P%" (
  echo f | xcopy /Y /Q "%P%" "%OUT%\%P%" >nul
  exit /b 0
)
echo [경고] release.allow에 적힌 항목이 없어요: %P%
exit /b 0
