@echo off
REM Use npm.cmd so this works even when PowerShell blocks npm.ps1
cd /d "%~dp0"
npm.cmd run dev
