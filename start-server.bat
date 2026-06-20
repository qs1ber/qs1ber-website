@echo off
cd /d "%~dp0"
echo.
echo  ========================================
echo   qs1ber portfolio  [build 20260621a]
echo   http://localhost:8080
echo   or: npm run dev  -^>  http://localhost:3000
echo  ========================================
echo.
echo  IMPORTANT: open via this server, NOT file://
echo  (3D + scroll require HTTP)
echo.
where py >nul 2>&1 && (
  py -m http.server 8080
) || (
  where python >nul 2>&1 && (
    python -m http.server 8080
  ) || (
    echo Install Python to run the local server.
    pause
  )
)
