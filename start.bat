@echo off
title AI Hair Studio
cd /d "%~dp0"

echo ============================================
echo   AI Hair Studio - Khoi dong he thong
echo ============================================
echo.

echo [1/3] Kiem tra dependencies...
if not exist node_modules\.bin\wrangler.cmd (
  echo   Dang cai npm packages...
  call npm install
)
echo   OK

echo [2/3] Cap nhat database...
call npx wrangler d1 execute ai-hair-db --local --file=./migrations/0001_create_users.sql >nul 2>&1
call npx wrangler d1 execute ai-hair-db --local --command="INSERT OR IGNORE INTO users (id, email, name, password_hash, role, daily_limit) VALUES ('admin-1', 'admin@test.com', 'Admin', 'lb9vljcPIDInKJZiS+/HfQ==:U7WyBi17ulP80GAF8T2CLw6ySwfEryv1delMMU4vyeU=', 'admin', 999999);" >nul 2>&1
echo   OK

echo [3/3] Mo 2 cua so:
echo   - API  : http://localhost:8788
echo   - Web  : http://localhost:3005
echo.
echo Dong cac cua so server khi khong dung nua.
echo ============================================

start "AI Hair API" cmd /c "npx wrangler pages dev . --ip 127.0.0.1 --port 8788"
start "AI Hair Web" cmd /c "npx next dev -p 3005"

echo.
echo Da mo 2 cua so server. Dong cua so nay khi muon tat.
pause
