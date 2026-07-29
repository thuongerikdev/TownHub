@echo off
REM ===== Biên dich bao cao TownHub bang XeLaTeX (chay 3 lan de cap nhat muc luc) =====
cd /d "%~dp0"
where xelatex >nul 2>nul
if %errorlevel%==0 (
  set "XELATEX=xelatex"
) else (
  set "XELATEX=C:\Users\ADMIN\AppData\Local\Programs\MiKTeX\miktex\bin\x64\xelatex.exe"
)
echo [1/3] xelatex...
"%XELATEX%" -interaction=nonstopmode main.tex >nul
echo [2/3] xelatex...
"%XELATEX%" -interaction=nonstopmode main.tex >nul
echo [3/3] xelatex...
"%XELATEX%" -interaction=nonstopmode main.tex >nul
echo.
echo === Xong! Mo main.pdf ===
if exist main.pdf start "" main.pdf
