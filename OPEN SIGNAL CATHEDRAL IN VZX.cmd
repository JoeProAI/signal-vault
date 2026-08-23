@echo off
setlocal
set "SIGNAL_VZX_EXE=C:\Program Files (x86)\Steam\steamapps\common\VZX Creative\vzx_artiste.exe"

if exist "%SIGNAL_VZX_EXE%" goto launch

echo VZX Creative was not found at:
echo "%SIGNAL_VZX_EXE%"
echo.
echo Edit SIGNAL_VZX_EXE in this launcher if your Steam library is elsewhere.
pause
exit /b 1

:launch

pushd "%~dp0"
"%SIGNAL_VZX_EXE%" -data_path "%~dp0vzx" -state signal-cathedral-v04
set "SIGNAL_VZX_EXIT=%ERRORLEVEL%"
popd

if not "%SIGNAL_VZX_EXIT%"=="0" (
  echo.
  echo VZX exited with code %SIGNAL_VZX_EXIT%.
  pause
)

exit /b %SIGNAL_VZX_EXIT%
