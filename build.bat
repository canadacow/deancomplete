@echo off
setlocal

set ROOT=%~dp0
set BUILD_DIR=%ROOT%build\indexer

if not exist "%BUILD_DIR%" (
  echo Build directory not found. Run configure.bat first.
  exit /b 1
)

echo Building C++ indexer...
cmake --build "%BUILD_DIR%" --config Release || goto :error

echo Building VS Code extension bundle...
pushd "%ROOT%"
npm run compile || goto :error
popd

echo Build complete.
exit /b 0

:error
echo Build failed.
exit /b 1


