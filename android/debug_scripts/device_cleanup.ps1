#!/usr/bin/env powershell
# Device Cleanup Checklist Script for Android Debugging
# Based on user's recommendations for fixing 80% of Android weirdness

Write-Host "=== Android Device Cleanup Checklist ===" -ForegroundColor Green
Write-Host "This script helps you through common fixes for Android issues" -ForegroundColor Cyan
Write-Host ""

# Find ADB path
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
            break
        }
    } catch { }
}

if (-not $adbPath) {
    Write-Host "WARNING: ADB not found. Some automated steps will be skipped." -ForegroundColor Yellow
    Write-Host ""
}

function Show-Step {
    param([string]$Title, [string]$Description, [string[]]$Instructions)
    
    Write-Host "[$Title]" -ForegroundColor Yellow
    Write-Host $Description -ForegroundColor White
    Write-Host ""
    
    foreach ($instruction in $Instructions) {
        Write-Host "  • $instruction" -ForegroundColor Cyan
    }
    
    Write-Host ""
    $response = Read-Host "Press Enter when completed, or 's' to skip"
    return $response -ne 's'
}

function Show-AutoStep {
    param([string]$Title, [string]$Description, [scriptblock]$Action)
    
    Write-Host "[$Title]" -ForegroundColor Yellow
    Write-Host $Description -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Press Enter to execute automatically, or 's' to skip"
    if ($response -ne 's') {
        try {
            & $Action
            Write-Host "✓ Completed successfully" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "Skipped" -ForegroundColor Gray
    }
    Write-Host ""
}

# Step 1: Device Reboot
Show-Step "1. REBOOT DEVICE" `
    "Reboot often fixes temporary issues and clears cached states" `
    @(
        "Power off your Android device completely",
        "Wait 10 seconds",
        "Power it back on",
        "Wait for full boot and unlock"
    )

# Step 2: Update Critical Apps
Show-Step "2. UPDATE CRITICAL APPS" `
    "Keep core Android components up to date" `
    @(
        "Open Google Play Store",
        "Go to 'My apps & games' or 'Manage apps & device'",
        "Update these critical apps:",
        "  - Google Play services",
        "  - Google Play Store",
        "  - Android System WebView",
        "  - Chrome",
        "  - YouTube (if testing media)"
    )

# Step 3: Battery/Power Management
Show-Step "3. BATTERY OPTIMIZATION" `
    "Whitelist critical apps from aggressive power management" `
    @(
        "Go to Settings → Battery (or iManager on some devices)",
        "Find 'Battery optimization' or 'App power management'",
        "Set these to 'Don't optimize' or 'Allow background activity':",
        "  - Your test app (Study Sentinel)",
        "  - Google Play services",
        "  - Any apps you're debugging",
        "Enable 'Unrestricted data usage' for the same apps"
    )

# Step 4: Network Settings
Show-Step "4. NETWORK OPTIMIZATION" `
    "Disable aggressive network switching that can cause issues" `
    @(
        "Go to Settings → Network/Wi-Fi",
        "Look for and DISABLE:",
        "  - 'Wi-Fi assistant' or 'Smart network switch'",
        "  - 'Adaptive Wi-Fi'",
        "  - 'Auto-switch between Wi-Fi and mobile data'",
        "If using VPN/AdBlock DNS, temporarily disable for testing"
    )

# Step 5: Clear App Caches
if ($adbPath) {
    Show-AutoStep "5. CLEAR APP CACHES (AUTOMATED)" `
        "Clear caches for problematic apps" `
        {
            Write-Host "Clearing YouTube cache..." -ForegroundColor Cyan
            & $adbPath shell "pm clear --cache-only com.google.android.youtube" 2>$null
            
            Write-Host "Clearing Google Play services cache..." -ForegroundColor Cyan
            & $adbPath shell "pm clear --cache-only com.google.android.gms" 2>$null
            
            Write-Host "Clearing Chrome cache..." -ForegroundColor Cyan
            & $adbPath shell "pm clear --cache-only com.android.chrome" 2>$null
        }
} else {
    Show-Step "5. CLEAR APP CACHES (MANUAL)" `
        "Clear caches for problematic apps" `
        @(
            "Go to Settings → Apps",
            "For each of these apps, tap → Storage → Clear Cache (NOT Clear Data):",
            "  - YouTube",
            "  - Google Play services",
            "  - Chrome",
            "  - Your test app if experiencing issues"
        )
}

# Step 6: Developer Options Check
Show-Step "6. DEVELOPER OPTIONS" `
    "Verify debugging settings are optimal" `
    @(
        "Go to Settings → Developer options",
        "Ensure these are enabled:",
        "  - USB debugging",
        "  - Stay awake (while charging)",
        "Consider enabling:",
        "  - Show taps (for screen recording)",
        "  - Pointer location (for touch debugging)",
        "Consider disabling:",
        "  - Don't keep activities (can cause issues)"
    )

# Step 7: Final Verification
if ($adbPath) {
    Show-AutoStep "7. VERIFY CONNECTION" `
        "Test ADB connection and app status" `
        {
            Write-Host "Checking device connection..." -ForegroundColor Cyan
            $devices = & $adbPath devices
            Write-Host $devices -ForegroundColor White
            
            Write-Host "\nChecking if Study Sentinel is running..." -ForegroundColor Cyan
            $appPid = & $adbPath shell "pidof com.studysentinel.app" 2>$null
            if ($appPid) {
                Write-Host "Study Sentinel is running (PID: $appPid)" -ForegroundColor Green
            } else {
                Write-Host "Study Sentinel not running - launch it to test" -ForegroundColor Yellow
            }
        }
}

Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "Your device should now be optimized for debugging." -ForegroundColor Cyan
Write-Host "If issues persist, consider:" -ForegroundColor White
Write-Host "  • Factory reset (last resort)" -ForegroundColor Gray
Write-Host "  • Different USB cable/port" -ForegroundColor Gray
Write-Host "  • Different device for comparison" -ForegroundColor Gray
Write-Host ""
Write-Host "Run