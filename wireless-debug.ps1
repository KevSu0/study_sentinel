# Wireless ADB Debug Script for Study Sentinel
# This script enables wireless debugging and monitoring of the Study Sentinel Android app

# Set ADB path
$ADB_PATH = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$DEVICE_IP = "192.168.1.2:5555"
$PACKAGE_NAME = "com.studysentinel.app"

Write-Host "=== Study Sentinel Wireless Debug Tools ===" -ForegroundColor Green
Write-Host ""

# Function to check wireless connection
function Test-WirelessConnection {
    Write-Host "Checking wireless ADB connection..." -ForegroundColor Yellow
    $devices = & $ADB_PATH devices
    if ($devices -match $DEVICE_IP) {
        Write-Host "✓ Wireless connection active: $DEVICE_IP" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ Wireless connection not found" -ForegroundColor Red
        return $false
    }
}

# Function to connect wirelessly
function Connect-Wirelessly {
    Write-Host "Connecting to device wirelessly..." -ForegroundColor Yellow
    & $ADB_PATH connect $DEVICE_IP
    Start-Sleep -Seconds 2
    Test-WirelessConnection
}

# Function to launch app
function Start-StudySentinel {
    Write-Host "Launching Study Sentinel app..." -ForegroundColor Yellow
    & $ADB_PATH -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
    Write-Host "✓ App launched successfully" -ForegroundColor Green
}

# Function to monitor logs
function Start-LogMonitoring {
    Write-Host "Starting log monitoring (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "Filtering for Study Sentinel and WebView logs..." -ForegroundColor Cyan
    & $ADB_PATH -s $DEVICE_IP logcat | Select-String -Pattern "StudySentinel|chromium|WebView|Capacitor"
}

# Function to clear app data
function Clear-AppData {
    Write-Host "Clearing Study Sentinel app data..." -ForegroundColor Yellow
    & $ADB_PATH -s $DEVICE_IP shell pm clear $PACKAGE_NAME
    Write-Host "✓ App data cleared" -ForegroundColor Green
}

# Main menu
function Show-Menu {
    Write-Host ""
    Write-Host "Available Commands:" -ForegroundColor Cyan
    Write-Host "1. Test wireless connection"
    Write-Host "2. Connect wirelessly"
    Write-Host "3. Launch Study Sentinel app"
    Write-Host "4. Monitor app logs"
    Write-Host "5. Clear app data"
    Write-Host "6. Exit"
    Write-Host ""
}

# Auto-check connection on script start
if (-not (Test-WirelessConnection)) {
    Connect-Wirelessly
}

# Interactive menu
while ($true) {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-6)"
    
    switch ($choice) {
        "1" { Test-WirelessConnection }
        "2" { Connect-Wirelessly }
        "3" { Start-StudySentinel }
        "4" { Start-LogMonitoring }
        "5" { Clear-AppData }
        "6" { 
            Write-Host "Goodbye!" -ForegroundColor Green
            break 
        }
        default { 
            Write-Host "Invalid choice. Please enter 1-6." -ForegroundColor Red 
        }
    }
    
    if ($choice -ne "4") {
        Write-Host ""
        Read-Host "Press Enter to continue"
    }
}