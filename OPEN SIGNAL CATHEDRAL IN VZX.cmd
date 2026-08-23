@echo off
setlocal
set "SIGNAL_VZX_EXE=C:\Program Files (x86)\Steam\steamapps\common\VZX Creative\vzx_artiste.exe"

if not exist "%SIGNAL_VZX_EXE%" (
  echo VZX Creative was not found at:
  echo %SIGNAL_VZX_EXE%
  echo.
  echo Edit SIGNAL_VZX_EXE in this launcher if your Steam library is elsewhere.
  pause
  exit /b 1
)

start "Signal Cathedral" "%SIGNAL_VZX_EXE%" -data_path "%~dp0vzx" -state signal-cathedral-v01
