import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { MetricsMigration } from './migration';

/**
 * Check and run migration if feature flag is enabled
 */
export async function checkAndRunMigration() {
  // Note: This is a client-side function. For actual implementation,
  // you might want to call this from a useEffect or appropriate lifecycle hook

  // We can't use hooks directly here, so we'll check localStorage or use a global state
  // In a real implementation, you might pass the feature flag state as a parameter

  const migrationFlag = localStorage.getItem('feature_flag:migration_v2');

  if (migrationFlag === 'true' || migrationFlag === null) {
    // Default to enabled if flag is not set
    const migration = new MetricsMigration();

    try {
      const shouldRun = await migration.shouldMigrate();
      if (shouldRun) {
        console.log('Starting metrics migration...');
        const success = await migration.migrateInBatches();
        if (success) {
          console.log('Metrics migration completed successfully');
        } else {
          console.error('Metrics migration failed');
        }
      }
    } catch (error) {
      console.error('Error during migration check:', error);
    }
  }
}

/**
 * Hook to check and run migration on component mount
 */
export function useMigration() {
  const { isEnabled } = useFeatureFlags();

  const runMigrationIfNeeded = async () => {
    if (isEnabled('migration_v2')) {
      await checkAndRunMigration();
    }
  };

  return { runMigrationIfNeeded };
}