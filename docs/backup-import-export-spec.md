# Backup/Import-Export File Format Specification
# Data portability and cross-device restore for Study Sentinel PWA

## File Format Overview

**File Extension**: `.study-backup`  
**MIME Type**: `application/vnd.study-sentinel.backup+json`  
**Format**: JSON with Gzip compression (base64 encoded)  
**Version**: `1.0.0`  

---

## 1. **FILE STRUCTURE**

### 1.1 **Container Format**

```json
{
  "formatVersion": "1.0.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "createdBy": "study-sentinel@v1.0.0",
  "deviceId": "device-1705321400000-abc123def",
  "encryption": {
    "algorithm": "none",
    "keyDerivation": "none"
  },
  "compression": {
    "algorithm": "gzip",
    "originalSize": 2457600,
    "compressedSize": 512000
  },
  "checksum": {
    "algorithm": "crc32",
    "value": "a1b2c3d4"
  },
  "data": "H4sIAAAAAAACA+2YUW7CMBAF/2VdRcFIJE..."
}
```

### 1.2 **Data Payload (After Decompression)**

```json
{
  "metadata": {
    "appVersion": "1.0.0",
    "schemaVersion": "2.0.0",
    "exportTime": "2024-01-15T10:30:00.000Z",
    "deviceInfo": {
      "platform": "Win32",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "screenResolution": "1920x1080"
    },
    "statistics": {
      "totalEvents": 1247,
      "totalStudyTime": 87654, // minutes
      "dateRange": {
        "firstEvent": "2023-06-01T09:00:00.000Z",
        "lastEvent": "2024-01-15T10:25:00.000Z"
      },
      "dataSizes": {
        "events": "1.2MB",
        "settings": "12KB",
        "rollups": "856KB"
      }
    }
  },
  "schema": {
    "events": "v2",
    "settings": "v1",
    "rollups": "v1",
    "badges": "v1"
  },
  "payload": {
    "events": [...],
    "settings": {...},
    "rollups": {...},
    "badges": {...}
  }
}
```

---

## 2. **PAYLOAD SCHEMAS**

### 2.1 **Events Array**

```json
{
  "events": [
    {
      "id": "event::device-abc123def::1705321400000::1::abc123def",
      "type": "study_session",
      "subject": "Mathematics",
      "duration": 45, // minutes
      "startTime": "2024-01-15T09:00:00.000Z",
      "endTime": "2024-01-15T09:45:00.000Z",
      "metadata": {
        "tags": ["calculus", "homework"],
        "difficulty": 7,
        "focus": 8,
        "mood": "focused",
        "location": "library"
      },
      "deviceId": "device-abc123def",
      "createdAt": "2024-01-15T09:45:00.000Z",
      "updatedAt": "2024-01-15T09:45:00.000Z"
    }
  ]
}
```

### 2.2 **Settings Object**

```json
{
  "settings": {
    "userPreferences": {
      "theme": "system",
      "language": "en",
      "timeZone": "Asia/Kolkata",
      "weekStartDay": 1, // Monday
      "studyGoals": {
        "dailyTarget": 120, // minutes
        "weeklyTarget": 840, // minutes
        "subjects": ["Mathematics", "Physics", "Chemistry"]
      }
    },
    "featureFlags": {
      "analytics_v2": true,
      "sync_enabled": false,
      "push_notifications_enabled": false,
      "advanced_analytics": true
    },
    "privacySettings": {
      "dataCollection": false,
      "analyticsSharing": false,
      "crashReporting": true
    },
    "notificationSettings": {
      "studyReminders": true,
      "achievementAlerts": true,
      "weeklyReports": false,
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00"
      }
    }
  }
}
```

### 2.3 **Rollups Object**

```json
{
  "rollups": {
    "daily": [
      {
        "date": "2024-01-15",
        "totalStudyTime": 245,
        "sessionCount": 4,
        "subjects": {
          "Mathematics": 120,
          "Physics": 75,
          "Chemistry": 50
        },
        "averageRating": 7.5,
        "tags": {
          "homework": 120,
          "exam_prep": 125
        }
      }
    ],
    "weekly": [...],
    "monthly": [...],
    "yearToDate": {...},
    "allTime": {...}
  }
}
```

### 2.4 **Badges Object**

```json
{
  "badges": {
    "customBadges": [
      {
        "id": "custom-001",
        "name": "Marathon Study Session",
        "description": "Studied for 4+ hours straight",
        "icon": "clock",
        "color": "#3B82F6",
        "isCustom": true
      }
    ],
    "earnedBadges": [
      {
        "badgeId": "custom-001",
        "earnedAt": "2024-01-15T14:30:00.000Z",
        "source": "user"
      }
    ]
  }
}
```

---

## 3. **CONSTRAINTS & VALIDATION**

### 3.1 **File Size Limits**

| Target | Maximum Size | Rationale |
|--------|---------------|-----------|
| Single backup | 10MB | Prevents excessive storage usage |
| Events count | 10,000 | Prevents performance issues |
| Date range | 5 years | Focus on recent, relevant data |
| Metadata size | 1MB | Prevents metadata bloat |

### 3.2 **Data Validation Rules**

```typescript
interface BackupValidationRules {
  // Event validation
  minEventDuration: 1; // minute
  maxEventDuration: 1440; // 24 hours
  validEventTypes: ['study_session', 'break', 'exam', 'assignment'];
  
  // Date validation
  maxFutureEvents: 7; // days ahead
  dateRangeLimit: 1825; // 5 years
  
  // Content validation
  maxSubjectLength: 100;
  maxTagLength: 50;
  maxTagsPerEvent: 10;
  
  // Structure validation
  requiredFields: ['id', 'type', 'subject', 'startTime', 'endTime'];
  idFormat: /^event::[^:]+::\d+::\d+::[a-zA-Z0-9]{9}$/;
}
```

### 3.3 **Checksum Validation**

```javascript
// CRC32 implementation for file integrity
function calculateCRC32(data: string): string {
  // Implementation omitted for brevity
  // Returns 8-character hex string
}

// File validation
function validateBackup(backup: BackupFile): ValidationResult {
  const calculated = calculateCRC32(backup.data);
  const valid = calculated === backup.checksum.value;
  
  return {
    valid,
    error: valid ? null : 'Checksum validation failed'
  };
}
```

---

## 4. **SECURITY & PRIVACY**

### 4.1 **Data Redaction Policy**

| Data Type | Redaction Action | Reason |
|-----------|------------------|---------|
| Personal identifiers | Hash/pseudonymize | Privacy protection |
| Location data | Remove | Privacy sensitivity |
| Free-text notes | Remove | Potential PII |
| Device fingerprints | Hash | Privacy protection |

### 4.2 **PII Detection Rules**

```javascript
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
};

function redactPII(text: string): string {
  let result = text;
  for (const [pattern, replacement] of Object.entries(PII_PATTERNS)) {
    result = result.replace(PII_PATTERNS[pattern], '[REDACTED]');
  }
  return result;
}
```

### 4.3 **Encryption (Future)**

```json
{
  "encryption": {
    "algorithm": "AES-256-GCM",
    "keyDerivation": "PBKDF2",
    "iterations": 100000,
    "salt": "base64EncodedSalt",
    "iv": "base64EncodedIV",
    "authTag": "base64EncodedAuthTag"
  }
}
```

---

## 5. **USER EXPERIENCE**

### 5.1 **Export UX Copy**

#### Export Confirmation Dialog
```
Export Your Study Data
──────────────────────

This will create a backup file containing:

• All study sessions and statistics
• Your preferences and settings
• Custom badges and achievements
• Learning progress and insights

The backup file will be saved to your device and can be used to:
• Restore data on a new device
• Recover from data loss
• Share data between devices

⚠️ Important:
• This file contains your personal study data
• Keep it in a safe, private location
• Do not share with others
• Maximum file size: 10MB

[Cancel] [Export Backup]
```

#### Export Progress
```
Creating Backup...
□□□□□□□□□□ 45%
• Gathering events (2,847 found)
• Calculating statistics
• Compressing data
• Validating integrity
```

### 5.2 **Import UX Copy**

#### Import Warning Dialog
```
Import Study Data
────────────────

⚠️ Warning: This action cannot be undone

This will replace all existing study data with data from the backup file:

• All current study sessions will be replaced
• Settings will be overwritten
• Progress statistics will be reset

Choose import method:

[ Merge Data ]  [ Replace All ]

Merge: Combines current data with backup data
Replace: Completely replaces all data with backup
```

#### Import Confirmation
```
Confirm Import
─────────────

Backup file contains:
• 2,847 study sessions
• 6 custom badges
• Settings from Study Sentinel v1.0.0
• Date range: Jun 2023 - Jan 2024

Device: Chrome on Windows
Created: Jan 15, 2024

[Cancel] [Confirm Import]
```

#### Import Progress
```
Importing Data...
□□□□□□□□□□ 78%
• Validating file format ✓
• Checking compatibility ✓
• Importing study sessions
• Calculating new statistics
• Updating rollups
```

---

## 6. **CROSS-DEVICE RESTORE**

### 6.1 **Device Compatibility Matrix**

| From/To | Android | iOS | Desktop | Tablet |
|----------|---------|-----|---------|--------|
| Android | ✅ | ✅ | ✅ | ✅ |
| iOS | ✅ | ✅ | ✅ | ✅ |
| Desktop | ✅ | ✅ | ✅ | ✅ |
| Tablet | ✅ | ✅ | ✅ | ✅ |

### 6.2 **Platform-Specific Instructions**

#### Android Chrome
```
1. Open Chrome browser
2. Go to chrome://downloads
3. Locate your .study-backup file
4. Tap to open and select "Import"
5. Confirm when prompted
```

#### iOS Safari
```
1. Open Safari browser
2. Go to Downloads folder
3. Tap the .study-backup file
4. Select "Copy to Study Sentinel"
5. Confirm when prompted
```

#### Desktop (Chrome/Firefox/Safari/Edge)
```
1. Open the backup file in your browser
2. Drag and drop onto Study Sentinel app
3. Or use Import button in settings
4. Confirm when prompted
```

### 6.3 **Failure Modes & Recovery**

| Error Scenario | User Message | Resolution |
|----------------|--------------|------------|
| Invalid file format | "This backup file is corrupted or incompatible" | Recreate backup |
| Version mismatch | "This backup was created with a newer version" | Update app |
| Incompatible schema | "Backup format not supported" | Contact support |
| Import failed | "Import failed. Your data was not modified." | Try again or contact support |
| Storage quota exceeded | "Not enough space to import this backup" | Free up space |

---

## 7. **ACCEPTANCE CRITERIA**

### 7.1 **Export → Import Round Trip**

1. **Given**: User has study data in golden dataset
2. **When**: User exports data
3. **Then**: File is created with valid format and checksum
4. **When**: User imports on fresh device
5. **Then**: All data is perfectly restored
6. **And**: All statistics match exactly
7. **And**: App works completely offline

### 7.2 **Offline Validation**

1. **Given**: Device is in airplane mode
2. **When**: User imports backup file
3. **Then**: Import completes successfully
4. **And**: All data is available offline
5. **And**: No network requests are made

### 7.3 **Cross-Browser Testing**

1. **Given**: Backup created on Chrome/Windows
2. **When**: Imported on Safari/iOS
3. **Then**: All data is restored correctly
4. **And**: No data corruption or loss
5. **And**: Performance metrics within acceptable range

---

## 8. **IMPLEMENTATION CHECKLIST**

- [ ] File format validation logic
- [ ] Compression/decompression utilities
- [ ] Checksum calculation and validation
- [ ] PII detection and redaction
- [ ] Export/Import UI components
- [ ] Progress indicators and feedback
- [ ] Error handling and recovery
- [ ] Cross-platform compatibility testing
- [ ] Offline import/export validation
- [ ] Golden dataset round-trip testing

---

*Generated: 2024-01-15*
*Version: 1.0.0*