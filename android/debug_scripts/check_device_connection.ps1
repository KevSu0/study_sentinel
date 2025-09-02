# Device Connection Checker for Study Sentinel
# Handles ADB path issues and provides connection guidance

Write-Host "=== Study Sentinel Device Connection Checker ===" -ForegroundColor Green

# Common ADB locations
$adbPaths = @(
    "adb",  # If in PATH
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe"
)

# Find working ADB
$adbPath = $null
foreach ($path in $adbPaths) {
    try {
        $result = & $path version 2>$null
        if ($result -match "Android Debug Bridge") {
            $adbPath = $path
            Write-Host "Found ADB at: $adbPath" -ForegroundColor Green
            break
        }
    } catch {
        # Continue searching
    }
}

if (-not $adbPath) {
    Write-Host "ERROR: ADB not found in common locations" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Android Platform Tools:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Cyan
    Write-Host "2. Extract to C:\Android\platform-tools\" -ForegroundColor Cyan
    Write-Host "3. Add to PATH or use full path" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Alternative: Install Android Studio which includes ADB" -ForegroundColor Yellow
    exit 1
}

# Check device connection
Write-Host "Checking device connection..." -ForegroundColor Cyan
$devices = & $adbPath devices 2>$null

if ($devices -match "device$") {
    Write-Host "SUCCESS: Android device connected and authorized" -ForegroundColor Green
    
    # Show connected devices
    $deviceLines = $devices -split "`n" | Where-Object { $_ -match "device$" }
    foreach ($device in $deviceLines) {
        $deviceId = ($device -split "`t")[0]
        Write-Host "Device ID: $deviceId" -ForegroundColor Yellow
    }
    
    # Check if Study Sentinel is running
    Write-Host ""
    Write-Host "Checking if Study Sentinel is running..." -ForegroundColor Cyan
    $appPid = & $adbPath shell "pidof com.studysentinel.app" 2>$null
    
    if ($appPid) {
        Write-Host "Study Sentinel is running (PID: $appPid)" -ForegroundColor Green
    } else {
        Write-Host "Study Sentinel not currently running" -ForegroundColor Yellow
        Write-Host "Launch the app to start monitoring" -ForegroundColor Cyan
    }
    
    # Export ADB path for other scripts
    $env:ADB_PATH = $adbPath
    Write-Host ""
    Write-Host "ADB path exported as: `$env:ADB_PATH" -ForegroundColor Green
    Write-Host "Ready for focused logging!" -ForegroundColor Green
    
} elseif ($devices -match "unauthorized") {
    Write-Host "ERROR: Device connected but unauthorized" -ForegroundColor Red
    Write-Host "Please check your device and tap 'Allow' on the USB debugging prompt" -ForegroundColor Yellow
    
} elseif ($devices -match "offline") {
    Write-Host "ERROR: Device is offline" -ForegroundColor Red
    Write-Host "Try unplugging and reconnecting the USB cable" -ForegroundColor Yellow
    
} else {
    Write-Host "ERROR: No devices found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Connect Android device via USB" -ForegroundColor Cyan
    Write-Host "2. Enable Developer Options (tap Build Number 7 times)" -ForegroundColor Cyan
    Write-Host "3. Enable USB Debugging in Developer Options" -ForegroundColor Cyan
    Write-Host "4. Allow USB debugging when prompted on device" -ForegroundColor Cyan
    Write-Host "5. Try different USB cable or port" -ForegroundColor Cyan
}