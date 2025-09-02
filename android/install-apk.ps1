# Study Sentinel APK Installation Script
Write-Host " Checking device authorization..." -ForegroundColor Yellow
$devices = adb devices
$deviceLine = $devices | Select-String "10BF5K09UY000R6"

if ($deviceLine -match "device$") {
    Write-Host " Device authorized! Installing APK..." -ForegroundColor Green
    adb install app/build/outputs/apk/debug/app-debug.apk
    if ($LASTEXITCODE -eq 0) {
        Write-Host " APK installed successfully!" -ForegroundColor Green
        Write-Host " Launching Study Sentinel app..." -ForegroundColor Cyan
        adb shell am start -n com.studysentinel.app/.MainActivity
        Write-Host " App should now be launching on your device!" -ForegroundColor Green
    } else {
        Write-Host " APK installation failed. Check the error above." -ForegroundColor Red
    }
} elseif ($deviceLine -match "unauthorized") {
    Write-Host "  Device still unauthorized. Please authorize USB debugging first." -ForegroundColor Red
} else {
    Write-Host " Device not found. Please connect your Android device." -ForegroundColor Red
}
