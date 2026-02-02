@echo off
echo Starting Mario Kart Dev Server...
echo.

:: Start the server in a new window
start "Mario Kart Dev Server" cmd /k "node server.js"

:: Wait a moment for server to start
timeout /t 2 /nobreak > nul

:: Open in Firefox
echo Opening game in Firefox...
start firefox http://localhost:3000

echo.
echo Dev mode started!
echo - Server running at http://localhost:3000
echo - Logs will be written to /logs folder
echo - Close the server window to stop
