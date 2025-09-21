// Example of updating export functions to include timezone metadata
import {
  addTimezoneMetadataToExport,
  formatExportWithTimezone,
  ExportMetadata
} from './export-timezone-metadata';

// Example study session data
interface StudySession {
  id: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}

// Example function to export study sessions with timezone metadata
export async function exportStudySessions(
  sessions: StudySession[],
  format: 'csv' | 'json' = 'json'
): Promise<Blob> {
  // Format data with timezone awareness
  const formattedSessions = sessions.map(session => ({
    ...session,
    startTime: formatExportWithTimezone(session.startTime, 'IST'),
    endTime: formatExportWithTimezone(session.endTime, 'IST'),
    timezone: 'IST'
  }));

  // Add metadata
  const dataWithMetadata = addTimezoneMetadataToExport(formattedSessions);

  if (format === 'json') {
    // For JSON export, include metadata
    const exportData = {
      sessions: dataWithMetadata,
      metadata: dataWithMetadata._timezoneMetadata,
      exportedAt: new Date().toISOString()
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  } else {
    // For CSV export, add metadata as header comment
    const metadata = dataWithMetadata._timezoneMetadata;
    const csvHeader = `# Study Sessions Export\n# Timezone: ${metadata.timezone}\n# Exported: ${metadata.exportTimestamp}\n# Boundary Time: ${metadata.boundaryTime}\n\n`;

    // Generate CSV content
    const headers = ['ID', 'Subject', 'Start Time', 'End Time', 'Duration (min)', 'Timezone'];
    const rows = formattedSessions.map(session => [
      session.id,
      session.subject,
      session.startTime,
      session.endTime,
      session.duration.toString(),
      session.timezone
    ]);

    const csvContent = [
      csvHeader,
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new Blob([csvContent], {
      type: 'text/csv'
    });
  }
}

// Usage example:
/*
const sessions: StudySession[] = [
  {
    id: '1',
    subject: 'Mathematics',
    startTime: new Date('2025-09-22T09:00:00+05:30'),
    endTime: new Date('2025-09-22T10:30:00+05:30'),
    duration: 90
  }
];

exportStudySessions(sessions, 'json')
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-sessions-${Date.now()}.json`;
    a.click();
  });
*/