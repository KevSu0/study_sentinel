// src/bugs/__tests__/bug-hunt-checklist.test.ts
import { executeBugHuntChecklist } from '../bug-hunt-checklist';

describe('Bug Hunt Checklist', () => {
  beforeAll(() => {
    // Set development mode for invariant checks
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    // Restore environment
    process.env.NODE_ENV = 'test';
  });

  it('should execute all bug hunt scenarios', async () => {
    const report = await executeBugHuntChecklist();

    // Log results for debugging
    console.log('\n🔍 Bug Hunt Results:');
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.scenario}: ${result.details}`);
    });

    console.log(`\n📊 Summary: ${report.summary.passed}/${report.summary.total} passed`);

    // Assert all tests pass
    expect(report.summary.failed).toBe(0);
    expect(report.summary.passed).toBe(report.summary.total);

    // Verify report structure
    expect(report.timestamp).toBeDefined();
    expect(report.buildHash).toBeDefined();
    expect(report.results).toHaveLength(6);
  });

  it('should include all required scenarios', async () => {
    const report = await executeBugHuntChecklist();
    const scenarios = report.results.map(r => r.scenario);

    expect(scenarios).toContain('Session reconstruction');
    expect(scenarios).toContain('Rollup calculations');
    expect(scenarios).toContain('Day boundary handling');
    expect(scenarios).toContain('Manual entries');
    expect(scenarios).toContain('Invariant validation');
    expect(scenarios).toContain('Edge cases');
  });

  it('should provide detailed failure information', async () => {
    // Mock a failure to test error reporting
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const report = await executeBugHuntChecklist();

    // Check that failed results have proper error details
    const failures = report.results.filter(r => !r.passed);
    failures.forEach(failure => {
      expect(failure.details).toBeTruthy();
      expect(failure.details.length).toBeGreaterThan(0);
    });
  });
});