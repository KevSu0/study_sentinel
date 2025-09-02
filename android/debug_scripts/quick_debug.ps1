# Quick Debug Launcher for Study Sentinel
# Automatically detects app state and starts appropriate logging

Write-Host "=== Study Sentinel Quick Debug ===" -ForegroundColor Green

# Find ADB path (prioritize full paths that work)
$adbPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\Sdk\platform-tools\adb.exe",
    "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    "adb"
)

$adbPath = $null
foreach ($path in $adbPaths) {
    try {
        $result = & $path version 2>$null
        if ($result -match "Android Debug Bridge") {
            $adbPath = $path
            Write-Host "Found ADB at: $adbPath" -ForegroundColor Green
            break
        }
    } catch { }
}

if (-not $adbPath) {
    Write-Host "ERROR: ADB not found. Run check_device_connection.ps1 first" -ForegroundColor Red
    exit 1
}

# Check device connection
$devices = & $adbPath devices 2>$null
$deviceConnected = $false
if ($devices) {
    foreach ($line in $devices) {
        if ($line -match "\s+device$") {
            $deviceConnected = $true
            break
        }
    }
}

if (-not $deviceConnected) {
    Write-Host "ERROR: No device connected. Please:" -ForegroundColor Red
    Write-Host "1. Connect Android device via USB" -ForegroundColor Yellow
    Write-Host "2. Enable USB Debugging in Developer Options" -ForegroundColor Yellow
    Write-Host "3. Run check_device_connection.ps1 to verify" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Debug info - ADB output:" -ForegroundColor Gray
    $devices | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    exit 1
}

Write-Host "Device connected successfully" -ForegroundColor Green

# Clear previous logs for clean start
Write-Host "Clearing log buffer..." -ForegroundColor Cyan
& $adbPath logcat -c

# Check if Study Sentinel is running
$packageName = "com.studysentinel.app"
$appPid = & $adbPath shell "pidof $packageName" 2>$null

if ($appPid) {
    Write-Host "Study Sentinel is running (PID: $appPid)" -ForegroundColor Green
    Write-Host "Starting focused logging..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Use PID-based filtering for maximum focus
    & $adbPath logcat --pid $appPid -v color,threadtime "*:V"
} else {
    Write-Host "Study Sentinel not detected. Starting tag-based monitoring..." -ForegroundColor Yellow
    Write-Host "Launch the app now to see logs appear" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Monitor for app launch and key debugging tags
    & $adbPath logcat -v color,threadtime `
        "StudySentinel:V" `
        "ReactNativeJS:V" `
        "Capacitor:V" `
        "ActivityManager:I" `
        "AndroidRuntime:E" `
        "StrictMode:V" `
        "System.err:V" `
        "*:E"
}