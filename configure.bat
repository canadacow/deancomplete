@echo off
setlocal

set ROOT=%~dp0
set BUILD_DIR=%ROOT%build\indexer
set VCPKG_DIR=%ROOT%vcpkg
set TOOLCHAIN=%VCPKG_DIR%\scripts\buildsystems\vcpkg.cmake

if not exist "%VCPKG_DIR%\vcpkg.exe" (
  echo vcpkg not found. Run vcpkg.bat first.
  exit /b 1
)

if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

echo Configuring CMake with vcpkg toolchain...
cmake -S "%ROOT%" -B "%BUILD_DIR%" -G "Ninja" ^
  -DCMAKE_TOOLCHAIN_FILE="%TOOLCHAIN%" ^
  -DVCPKG_TARGET_TRIPLET=x64-windows ^
  -DCMAKE_BUILD_TYPE=Release || goto :error

echo Configure complete.
exit /b 0

:error
echo Configure failed.
exit /b 1


