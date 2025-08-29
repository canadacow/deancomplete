@echo off
setlocal

set ROOT=%~dp0
set VCPKG_DIR=%ROOT%vcpkg

if not exist "%VCPKG_DIR%" (
  echo Cloning vcpkg into %VCPKG_DIR%
  git clone https://github.com/microsoft/vcpkg "%VCPKG_DIR%" || goto :error
)

echo Bootstrapping vcpkg...
call "%VCPKG_DIR%\bootstrap-vcpkg.bat" -disableMetrics || goto :error

echo Installing dependencies from vcpkg.json...
"%VCPKG_DIR%\vcpkg.exe" install --triplet x64-windows --clean-after-build || goto :error

echo vcpkg setup complete.
exit /b 0

:error
echo vcpkg setup failed.
exit /b 1


