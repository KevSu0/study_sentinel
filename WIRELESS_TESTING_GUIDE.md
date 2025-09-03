# Study Sentinel - Wireless Testing Guide

## Overview
This guide provides complete instructions for testing the Study Sentinel Android app wirelessly using ADB over WiFi, eliminating the need for USB cables during development and testing.

## Prerequisites
- Android device with USB debugging enabled
- Android SDK Platform Tools installed
- Device and computer connected to the same WiFi network
- Study Sentinel app installed on the device

## Initial Setup (One-time)

### 1. Enable Wireless ADB
```powershell
# Connect device via USB first
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

# Enable TCP/IP mode on port 5555
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" tcpip 5555
```

### 2. Get Device IP Address
```powershell
# Get the device's WiFi IP address
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell "ip route | grep wlan"
```

### 3. Connect Wirelessly
```powershell
# Connect to device wirelessly (replace IP with your device's IP)
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect 192.168.1.2:5555

# Verify connection
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

## Daily Usage

### Quick Connection Script
Use the provided `wireless-debug.ps1` script for easy wireless testing:

```powershell
.\wireless-debug.ps1
```

This interactive script provides:
- Automatic connection testing
- One-click app launching
- Real-time log monitoring
- App data clearing
- Connection management

### Manual Commands

#### Launch Study Sentinel App
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.1.2:5555 shell monkey -p com.studysentinel.app -c android.intent.category.LAUNCHER 1
```

#### Monitor App Logs
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.1.2:5555 logcat | Select-String -Pattern "StudySentinel|chromium|WebView|Capacitor"
```

#### Clear App Data
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.1.2:5555 shell pm clear com.studysentinel.app
```

#### Install APK Wirelessly
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s 192.168.1.2:5555 install -r android\app\build\outputs\apk\debug\app-debug.apk
```

## Device Information
- **Package Name**: `com.studysentinel.app`
- **Device IP**: `192.168.1.2:5555`
- **ADB Port**: `5555`

## Troubleshooting

### Connection Issues
1. **Device not found**: Ensure both devices are on the same WiFi network
2. **Authorization required**: Accept the USB debugging dialog on the device
3. **Connection timeout**: Restart ADB server with `adb kill-server`

### App Launch Issues
1. **Package not found**: Verify app is installed with `adb shell pm list packages | findstr sentinel`
2. **Activity not found**: Use monkey command instead of direct activity launch

### Performance Issues
1. **Slow response**: Check WiFi signal strength
2. **Frequent disconnections**: Ensure device doesn't go to sleep

## Benefits of Wireless Testing

✅ **Freedom of Movement**: Test app without cable constraints
✅ **Real-world Scenarios**: Test in actual usage environments
✅ **Consistent Debugging**: Maintain debug connection during movement
✅ **Quick Deployment**: Install and test builds instantly
✅ **Multiple Devices**: Connect to multiple devices simultaneously

## Security Notes
- ADB over WiFi is less secure than USB
- Only use on trusted networks
- Disable when not needed: `adb usb`
- Consider using VPN for remote testing

## Quick Reference Commands

| Action | Command |
|--------|----------|
| Connect | `adb connect 192.168.1.2:5555` |
| Disconnect | `adb disconnect 192.168.1.2:5555` |
| Switch to USB | `adb usb` |
| List devices | `adb devices` |
| Launch app | `adb -s 192.168.1.2:5555 shell monkey -p com.studysentinel.app -c android.intent.category.LAUNCHER 1` |
| Monitor logs | `adb -s 192.168.1.2:5555 logcat` |

---

**Note**: Replace `192.168.1.2` with your actual device IP address. The IP address may change if the device reconnects to WiFi.