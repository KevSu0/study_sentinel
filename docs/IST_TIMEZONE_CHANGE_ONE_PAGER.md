# STUDY SENTINEL – Timezone Update: Your Study Day Now Uses IST

---

## What's Changing?

**Your study day now runs from 4:00 AM to 4:00 AM IST** (Indian Standard Time).

This means:
- Late-night sessions (after 4 AM) now count toward the **same day**
- Morning sessions (before 4 AM) count toward the **previous day**
- All analytics and exports default to IST
- Your streaks may adjust if you study near 4 AM

---

## Why This Change?

**Better alignment with how you actually study:**

| Before (UTC) | After (IST) |
|--------------|-------------|
| Study day: 4:00 AM - 4:00 AM UTC | Study day: 4:00 AM - 4:00 AM IST |
| 9:30 PM IST → counted as next day | 9:30 PM IST → counted as same day |
| Confusing for Indian users | Matches local study patterns |

---

## Compare During Transition (30 Days)

Use the **New (IST) / Legacy (UTC)** toggle on your analytics page:

```
[ View: New (IST 4:00) ] [ Legacy (UTC 4:00) ]
```

**When to use Legacy:**
- Reconciling past reports
- Comparing month-over-month data
- When you notice unexpected changes

---

## Export Options

All exports now include:
```json
{
  "timeZone": "Asia/Kolkata",
  "boundaryRule": "IST_4AM",
  "exportDate": "2024-01-15"
}
```

**Need Legacy format?** Choose "Legacy" in export options during the 30-day transition.

---

## What Stays the Same?

✅ **Raw session data** (still stored in UTC)
✅ **Session start/end times** (exact same)
✅ **Your study history** (just grouped differently)
✅ **All features and functionality**

---

## Quick Examples

### Before (UTC Boundary)
```
Jan 15:
  11:00 PM IST session → counted as Jan 16
  Daily total: 2 hours (misses late session)
```

### After (IST Boundary)
```
Jan 15:
  11:00 PM IST session → counted as Jan 15
  Daily total: 3.5 hours (includes late session)
```

---

## When Does This Happen?

- **Now:** Rolling out to all users
- **Next 30 days:** Compare with Legacy view
- **After 30 days:** Legacy view removed (unless extended)

---

## Questions?

**Help Center:** [Link to full article]
**Support:** in-app help or email
**Feedback:** Use the "Help us improve" button

---

*Study Sentinel – Making your learning journey clearer, every day*