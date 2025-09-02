@echo off
REM Focused Android Logging Script for Study Sentinel (Batch version)
REM Usage: focused_logging.bat [clear] [verbose]

set PACKAGE_NAME=com.studysentinel.app
set LOG_LEVEL=V

echo === Study Sentinel Focused Logging ===
echo Package: %PACKAGE_NAME%
echo.

REM Clear logs if first argument is "clear"
if "%1"=="clear" (
    echo Clearing logcat buffer...
    adb logcat -c
    timeout /t 1 /nobreak >nul
)

REM Check device connection
adb devices | findstr "device$" >nul
if errorlevel 1 (
    echo ERROR: No Android device connected or authorized
    echo Please connect device and enable USB debugging
    pause
    exit /b 1
)

REM Get app PID if running
for /f "tokens=*" %%i in ('adb shell "pidof %PACKAGE_NAME%" 2^>nul') do set PID=%%i

if defined PID (
    echo App is running with PID: %PID%
    echo Starting PID-based logging (Ctrl+C to stop)...
    adb logcat --pid %PID% -v color,threadtime "*:%LOG_LEVEL%"
) else (
    echo App not currently running. Using tag-based filtering...
    echo Launch the Study Sentinel app now, then press any key to continue
    pause >nul
    
    echo Starting tag-based logging (Ctrl+C to stop)...
    if "%2"=="verbose" (
        REM Verbose mode
        adb logcat -v threadtime "StudySentinel:V" "ReactNativeJS:V" "Capacitor:V" "WebView:I" "Chromium:W" "AndroidRuntime:E" "ActivityManager:I" "StrictMode:V" "*:S"
    ) else (
        REM Standard mode
        adb logcat -v threadtime "StudySentinel:V" "ReactNativeJS:V" "Capacitor:V" "AndroidRuntime:E" "StrictMode:V" "*:E"
    )
)