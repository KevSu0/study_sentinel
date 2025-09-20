import '@testing-library/jest-dom';
import { setConfig } from 'next/config';
import { MockCanaryManager, MockMonitoringDashboard } from './__mocks__/canary-manager-mock';

setConfig({ publicRuntimeConfig: {} });

jest.mock('@/lib/canary-manager', () => ({
  CanaryManager: MockCanaryManager,
}));

jest.mock('@/lib/monitoring-dashboard', () => ({
  MonitoringDashboard: MockMonitoringDashboard,
}));
