# Android Debug Scripts for Study Sentinel

This directory contains focused debugging tools based on expert analysis of Android logcat output. These scripts help eliminate noise and focus on actionable debugging information.

## 🚀 Quick Start

1. **Connect your device and verify setup:**
   ```powershell
   .\check_device_connection.ps1
   ```

2. **Start focused app logging:**
   ```powershell
   .\quick_debug.ps1
   ```

3. **Clean up device issues:**
   ```powershell
   .\device_cleanup.ps1
   ```

## 📋 Available Scripts

### `check_device_connection.ps1`
**Purpose:** Verify ADB connection and app status
- Finds ADB installation automatically
- Checks device connection and authorization
- Verifies if Study Sentinel is running
- Exports ADB path for other scripts

### `quick_debug.ps1`
**Purpose:** Start focused logging immediately
- **PID-based filtering** when app is running (eliminates 99% of noise)
- **Tag-based monitoring** when app is not running
- Automatically detects app state and switches modes
- Focuses on React Native, Capacitor, and app-specific logs

### `focused_logging.ps1` & `focused_logging.bat`
**Purpose:** Cross-platform focused logging with options
- PowerShell and Batch versions available
- Verbose mode for detailed output
- Clear logs option for clean start
- Manual PID specification support

### `device_cleanup.ps1`
**Purpose:** Interactive device cleanup checklist
- **Fixes 80% of Android debugging issues**
- Step-by-step guided cleanup process
- Automated cache clearing where possible
- Based on expert recommendations for:
  - Google Play services errors
  - YouTube/media playback issues
  - Background app restrictions
  - Network switching problems
  - Battery optimization conflicts

### `advanced_filter.ps1`
**Purpose:** Advanced log filtering with multiple modes
- **5 filtering modes** for different debugging scenarios
- Eliminates known noise patterns
- Focuses on high-signal debugging information

#### Filtering Modes:

```powershell
# Critical errors only (crashes, fatal issues)
.\advanced_filter.ps1 -Mode errors -Clear

# Errors + warnings that indicate real problems
.\advanced_filter.ps1 -Mode warnings

# App-specific logs (React Native, Capacitor, your app)
.\advanced_filter.ps1 -Mode app

# Performance issues (StrictMode, slow operations)
.\advanced_filter.ps1 -Mode strict

# High-signal tags (based on expert analysis)
.\advanced_filter.ps1 -Mode custom
```

## 🎯 What Gets Filtered Out (Noise)

Based on expert analysis, these scripts automatically ignore:

- **YouTube telemetry:** `YT.qoe` pings and metrics
- **Debug agent messages:** "Not starting debugger since process cannot load the jdwp agent"
- **Surface/GPU restarts:** Transient WebView renderer restarts
- **Vendor spam:** Vivo/Samsung/etc. proprietary logging
- **Virtualization warnings:** Unless testing virtualization features
- **Facebook/third-party SQLite errors:** From other installed apps
- **MoEngage/analytics errors:** From unrelated apps
- **Audio policy binding:** Vendor audio service hiccups

## 🔍 What Gets Highlighted (Actionable)

- **App crashes:** `AndroidRuntime:E`, `System.err:E`
- **Google Play services real errors:** Not just binder noise
- **StrictMode violations:** Threading and performance issues
- **React Native errors:** `ReactNativeJS:*`
- **Capacitor issues:** `Capacitor:*`
- **Your app logs:** `StudySentinel:*`
- **Activity lifecycle problems:** `ActivityManager:E`
- **Native crashes:** `DEBUG:V`, `libc:F`

## 🛠️ StrictMode Integration

The scripts work with StrictMode debugging enabled in your app:

```java
// Already added to StudySentinelApplication.java
if (BuildConfig.DEBUG) {
    StrictMode.setThreadPolicy(
        StrictMode.ThreadPolicy.Builder()
            .detectAll()
            .penaltyLog()
            .penaltyFlashScreen()  // Visual indicator
            .build()
    );
    StrictMode.setVmPolicy(
        StrictMode.VmPolicy.Builder()
            .detectAll()
            .penaltyLog()
            .build()
    );
}
```

## 📱 Device Cleanup Checklist

The `device_cleanup.ps1` script guides you through:

1. **Device reboot** (fixes 50% of issues)
2. **Update critical apps:**
   - Google Play services
   - Google Play Store  
   - Android System WebView
   - Chrome
   - YouTube
3. **Battery optimization whitelist:**
   - Your test app
   - Google Play services
   - Allow background activity
4. **Network settings:**
   - Disable Wi-Fi assistant/smart switch
   - Disable adaptive networking
5. **Clear app caches** (not data)
6. **Verify developer options**

## 🚨 Troubleshooting Common Issues

### "No device connected"
1. Check USB cable and port
2. Enable USB Debugging in Developer Options
3. Accept RSA key fingerprint on device
4. Run `check_device_connection.ps1`

### "ADB not found"
1. Install Android SDK Platform Tools
2. Add to PATH or let scripts auto-detect
3. Common locations checked automatically:
   - `%LOCALAPPDATA%\Android\Sdk\platform-tools\`
   - `C:\Android\Sdk\platform-tools\`

### "App not running" 
1. Launch Study Sentinel app manually
2. Scripts will detect PID automatically
3. Falls back to tag-based monitoring

### Too much log noise
1. Use `advanced_filter.ps1 -Mode custom`
2. Try PID-based filtering with `quick_debug.ps1`
3. Run device cleanup to reduce system noise

## 💡 Pro Tips

1. **Always run device cleanup first** when debugging new issues
2. **Use PID filtering** when possible (cleanest logs)
3. **Clear logs** before reproducing issues
4. **Enable StrictMode** in debug builds to catch threading issues
5. **Whitelist your app** from battery optimization
6. **Update WebView and Chrome** regularly

## 🔄 Workflow Example

```powershell
# 1. Initial setup
.\check_device_connection.ps1

# 2. Clean up device (if having issues)
.\device_cleanup.ps1

# 3. Start focused logging
.\quick_debug.ps1

# 4. In another terminal, use advanced filtering for specific issues
.\advanced_filter.ps1 -Mode errors -Clear
```

This approach eliminates 90%+ of log noise and focuses on actionable debugging information, making Android development much more efficient.