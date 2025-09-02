# Focused Android Logging Script for Study Sentinel
# This script provides clean, app-specific logging without system noise

param(
    [string]$PackageName = "com.studysentinel.app",
    [switch]$Clear,
    [switch]$Verbose,
    [string]$LogLevel = "V"
)

Write-Host "=== Study Sentinel Focused Logging ===" -ForegroundColor Green
Write-Host "Package: $PackageName" -ForegroundColor Yellow

# Clear logs if requested
if ($Clear) {
    Write-Host "Clearing logcat buffer..." -ForegroundColor Cyan
    adb logcat -c
    Start-Sleep -Seconds 1
}

# Check if device is connected
$devices = adb devices
if ($devices -notmatch "device$") {
    Write-Host "ERROR: No Android device connected or authorized" -ForegroundColor Red
    Write-Host "Please connect device and enable USB debugging" -ForegroundColor Yellow
    exit 1
}

# Get app PID if running
$pid = adb shell "pidof $PackageName" 2>$null
if ($pid) {
    Write-Host "App is running with PID: $pid" -ForegroundColor Green
    
    # Method 1: PID-based filtering (most focused)
    Write-Host "Starting PID-based logging (Ctrl+C to stop)..." -ForegroundColor Cyan
    adb logcat --pid $pid -v color,threadtime "*:$LogLevel"
} else {
    Write-Host "App not currently running. Using package-based filtering..." -ForegroundColor Yellow
    Write-Host "Launch the Study Sentinel app now, then press Enter to continue" -ForegroundColor Cyan
    Read-Host
    
    # Method 2: High-signal tag filtering
    Write-Host "Starting tag-based logging (Ctrl+C to stop)..." -ForegroundColor Cyan
    if ($Verbose) {
        # Verbose mode: include more tags
        adb logcat -v threadtime `
            "StudySentinel:V" `
            "ReactNativeJS:V" `
            "Capacitor:V" `
            "WebView:I" `
            "Chromium:W" `
            "AndroidRuntime:E" `
            "ActivityManager:I" `
            "StrictMode:V" `
            "*:S"
    } else {
        # Standard mode: focus on errors and app-specific logs
        adb logcat -v threadtime `
            "StudySentinel:V" `
            "ReactNativeJS:V" `
            "Capacitor:V" `
            "AndroidRuntime:E" `
            "StrictMode:V" `
            "*:E"
    }
}