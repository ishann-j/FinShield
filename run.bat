@echo off
echo ========================================================
echo  Starting FinGuard Sentinel System
echo ========================================================

cd backend
start "FinGuard Backend" cmd /k "node src/main.js"

cd ..\frontend
start "FinGuard Frontend" cmd /k "npm.cmd run dev"

echo.
echo ========================================================
echo  Backend:  http://localhost:5050
echo  Frontend: http://localhost:3000
echo ========================================================
pause
