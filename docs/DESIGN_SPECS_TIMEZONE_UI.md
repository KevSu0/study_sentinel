# Design Specifications: Timezone UI Elements

## 1. Global Banner

**Placement:** Top of app, below navigation
**Style:** Blue info banner, dismissible
**Content:**
```
[Info Icon] We've aligned your study day to IST (4:00 AM–4:00 AM) for clearer stats.
Compare with Legacy (UTC) using the toggle for 30 days. [Learn more] [X]
```

**States:**
- Default: Blue background (#EBF8FF)
- Hover: Slightly darker blue (#E1EDFD)
- Dismissed: Hidden (stored in localStorage)

## 2. Analytics Page Toggle

**Placement:** Top right of analytics dashboard, below date range picker
**Style:** Toggle switch group, medium prominence
**Content:**
```
View: [ New (IST 4:00) ] [ Legacy (UTC 4:00) ]
```

**Visual Design:**
- Active state: Blue background, white text
- Inactive state: Light gray background
- Hover: Slight elevation change
- IST label: Include small India flag icon 🇮🇳

**Tooltip on hover:**
"New (IST 4:00) groups sessions by local Indian time. Legacy (UTC 4:00) shows the previous grouping."

## 3. First-Visit Modal

**Trigger:** First visit to analytics page after update
**Style:** Centered modal, overlay backdrop
**Size:** Medium (500px width)

**Content:**
```
[Header]
Your analytics now use IST

[Body]
Your study day now runs 4:00 AM IST → 4:00 AM IST.

• Why: Late-night sessions count with the day they belong to locally
• Compare: Use the View toggle for a 30-day side-by-side comparison
• Exports: Default to IST; Legacy export available during transition

[Buttons]
[Got it] [Open Help Article]
```

## 4. Timestamp Display Updates

**Pattern:** All timestamps should show timezone
**Examples:**
- "Jan 15, 2024, 2:30 PM IST"
- "Study day: Jan 15, 2024 [IST]"
- "Session ended at 11:45 PM IST"

**Style:**
- IST indicator in muted gray or as a badge
- Consistent across all components

## 5. Export Dialog Enhancement

**New Section:** Boundary options
```
[ ] Export in Legacy (UTC) format for compatibility
[✓] Include timezone metadata (recommended)
```

**Metadata Preview:**
```json
{
  "exportInfo": {
    "timezone": "Asia/Kolkata",
    "boundaryRule": "IST_4AM",
    "generatedAt": "2024-01-15T14:30:00Z"
  }
}
```

## 6. Help Center Integration

**Placement:**
- Link in banner
- Link in modal
- Footer link
- In-app help menu

**Icon:** Globe/clock icon to represent timezone

## 7. Loading States

**During boundary calculation:**
- Show spinner with "Calculating study day..."
- Keep previous data visible until new data loads

## 8. Empty States

**When no data for selected timezone:**
```
[Calendar Icon]
No sessions found for this time period
Try adjusting your date range or switching timezones
```

## 9. Mobile Considerations

**Banner:** Full width, text may wrap
**Toggle:** Stack vertically if space constrained
```
View:
[ New (IST 4:00) ]
[ Legacy (UTC 4:00) ]
```

**Modal:** Full width on mobile, bottom sheet style preferred

## 10. Accessibility

- Toggle should be keyboard navigable
- Screen reader: "View: New (IST 4:00) selected, Legacy (UTC 4:00) available"
- Color contrast: 4.5:1 minimum for text
- Reduced motion: Disable toggle animations when preferred

## 11. Micro-interactions

- Toggle: Smooth slide transition
- Banner: Gentle fade in/out
- Timestamp: Subtle highlight when timezone shown for first time
- Export: Checkmark animation when metadata included

---

## Design Assets Needed

1. **Icons:**
   - India flag (small, 16x16)
   - Globe/clock for timezone
   - Info circle

2. **Illustrations:**
   - Before/after comparison graphic
   - Calendar with timezone overlay

3. **Templates:**
   - Banner component
   - Toggle component styles
   - Modal template
   - Export dialog update