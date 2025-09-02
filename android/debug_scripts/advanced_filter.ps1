#!/usr/bin/env powershell
# Advanced Log Filtering for Android Debugging
# Filters out noise and focuses on actionable debugging information

param(
    [string]$Mode = "errors",  # errors, warnings, app, strict, custom
    [string]$Package = "com.studysentinel.app",
    [int]$Tail = 0,  # Number of recent lines to show (0 = all)
    [switch]$Clear,  # Clear logs before starting
    [switch]$Help
)

if ($Help) {
    Write-Host "=== Advanced Log Filtering ===" -ForegroundColor Green
    Write-Host "Usage: .\advanced_filter.ps1 [options]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor Yellow
    Write-Host "  errors    - Show only critical errors and crashes" -ForegroundColor White
    Write-Host "  warnings  - Include warnings that might indicate issues" -ForegroundColor White
    Write-Host "  app       - Focus on your app + React Native + Capacitor" -ForegroundColor White
    Write-Host "  strict    - StrictMode violations and performance issues" -ForegroundColor White
    Write-Host "  custom    - High-signal tags from user analysis" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Package  - Target package name (default: com.studysentinel.app)" -ForegroundColor White
    Write-Host "  -Tail     - Show only last N lines (0 = all)" -ForegroundColor White
    Write-Host "  -Clear    - Clear log buffer before starting" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\advanced_filter.ps1 -Mode errors -Clear" -ForegroundColor Cyan
    Write-Host "  .\advanced_filter.ps1 -Mode app -Package com.myapp" -ForegroundColor Cyan
    Write-Host "  .\advanced_filter.ps1 -Mode custom -Tail 100" -ForegroundColor Cyan
    exit 0
}

Write-Host "=== Advanced Log Filtering ===" -ForegroundColor Green
Write-Host "Mode: $Mode | Package: $Package" -ForegroundColor Cyan

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
    Write-Host "ERROR: ADB not found" -ForegroundColor Red
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
    Write-Host "ERROR: No device connected" -ForegroundColor Red
    exit 1
}

# Clear logs if requested
if ($Clear) {
    Write-Host "Clearing log buffer..." -ForegroundColor Cyan
    & $adbPath logcat -c
}

# Define filter patterns based on user's analysis
$filterArgs = @()

switch ($Mode) {
    "errors" {
        Write-Host "Filtering for CRITICAL ERRORS only" -ForegroundColor Red
        $filterArgs = @(
            "-v", "threadtime",
            "AndroidRuntime:E",     # App crashes
            "System.err:E",         # System errors
            "DEBUG:E",              # Native crashes
            "libc:F",               # Fatal errors
            "*:F"                   # All fatal logs
        )
    }
    
    "warnings" {
        Write-Host "Filtering for ERRORS and WARNINGS" -ForegroundColor Yellow
        $filterArgs = @(
            "-v", "threadtime",
            "AndroidRuntime:E",
            "System.err:E",
            "ActivityManager:W",     # Activity issues
            "WindowManager:W",      # Window/display issues
            "PackageManager:W",     # Package issues
            "GoogleApiManager:E",   # Play services errors
            "*:E"
        )
    }
    
    "app" {
        Write-Host "Filtering for APP-SPECIFIC logs" -ForegroundColor Green
        # Try to get app PID for focused logging
        $appPid = & $adbPath shell "pidof $Package" 2>$null
        if ($appPid) {
            Write-Host "App running (PID: $appPid) - using PID filter" -ForegroundColor Green
            $filterArgs = @(
                "--pid", $appPid,
                "-v", "color,threadtime",
                "*:V"
            )
        } else {
            Write-Host "App not running - using tag filter" -ForegroundColor Yellow
            $filterArgs = @(
                "-v", "threadtime",
                "ReactNativeJS:V",      # React Native logs
                "Capacitor:V",          # Capacitor logs
                "StudySentinel:V",      # App-specific logs
                "WebView:I",            # WebView issues
                "chromium:I",           # Chromium engine
                "ActivityManager:I",    # Activity lifecycle
                "*:E"                   # All errors
            )
        }
    }
    
    "strict" {
        Write-Host "Filtering for STRICTMODE and PERFORMANCE issues" -ForegroundColor Magenta
        $filterArgs = @(
            "-v", "threadtime",
            "StrictMode:V",          # StrictMode violations
            "Looper:W",             # Slow operations
            "Choreographer:I",       # Frame drops
            "OpenGLRenderer:W",     # Rendering issues
            "ViewRootImpl:W",       # View performance
            "ActivityThread:W",     # Main thread issues
            "*:E"
        )
    }
    
    "custom" {
        Write-Host "Filtering for HIGH-SIGNAL tags (based on user analysis)" -ForegroundColor Cyan
        $filterArgs = @(
            "-v", "threadtime",
            "AndroidRuntime:E",     # Crashes
            "GoogleApiManager:E",   # Play services real errors
            "ActivityManager:E",    # Activity failures
            "StrictMode:*",         # All StrictMode
            "libc:D",               # Native debugging
            "DEBUG:V",              # Native crashes
            "System.err:V",         # System errors
            "ReactNativeJS:V",      # React Native
            "Capacitor:V",          # Capacitor
            "StudySentinel:V",      # Your app
            "*:S"                   # Silence everything else
        )
    }
    
    default {
        Write-Host "Unknown mode: $Mode" -ForegroundColor Red
        Write-Host "Use -Help to see available modes" -ForegroundColor Yellow
        exit 1
    }
}

# Add tail option if specified
if ($Tail -gt 0) {
    Write-Host "Showing last $Tail lines" -ForegroundColor Gray
    $filterArgs = @("-t", $Tail.ToString()) + $filterArgs
}

Write-Host "Starting filtered logging... (Press Ctrl+C to stop)