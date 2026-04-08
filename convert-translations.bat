@echo off
REM Double-click this file (or run it from a terminal) after editing translations.csv
REM to regenerate translations.js for the game to pick up your changes.
cd /d "%~dp0"
node convert-translations.js
pause
