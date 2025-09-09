import { jest } from '@jest/globals';

const useStats = jest.fn(() => ({
  stats: {},
  loading: false,
  error: null,
  date: new Date('2024-01-01T12:00:00.000Z'),
  setDate: jest.fn(),
  reload: jest.fn(),
  realProductivityData: [],
  activeProductivityData: [],
}));

export default useStats;