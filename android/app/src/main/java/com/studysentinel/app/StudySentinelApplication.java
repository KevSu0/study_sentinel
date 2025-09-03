package com.studysentinel.app;

import android.app.Application;
import android.os.StrictMode;
import android.util.Log;
public class StudySentinelApplication extends Application {
    private static final String TAG = "StudySentinel";

    @Override
    public void onCreate() {
        super.onCreate();
        
        // Enable StrictMode to catch threading and performance issues
        Log.d(TAG, "Enabling StrictMode for debug build");
        enableStrictMode();
    }

    private void enableStrictMode() {
        // Thread policy - detects network calls, disk reads/writes on main thread
        StrictMode.ThreadPolicy.Builder threadPolicyBuilder = new StrictMode.ThreadPolicy.Builder()
                .detectAll() // Detect all thread violations
                .penaltyLog() // Log violations to logcat
                .penaltyFlashScreen(); // Flash screen on violation (visual indicator)

        // VM policy - detects memory leaks, unclosed resources
        StrictMode.VmPolicy.Builder vmPolicyBuilder = new StrictMode.VmPolicy.Builder()
                .detectAll() // Detect all VM violations
                .penaltyLog(); // Log violations to logcat

        // Apply policies
        StrictMode.setThreadPolicy(threadPolicyBuilder.build());
        StrictMode.setVmPolicy(vmPolicyBuilder.build());

        Log.d(TAG, "StrictMode enabled - watching for threading and performance issues");
        Log.d(TAG, "Thread violations will flash screen and log to 'StrictMode' tag");
        Log.d(TAG, "VM violations (leaks, unclosed resources) will log to 'StrictMode' tag");
    }
}