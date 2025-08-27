import { jest } from '@jest/globals';
import { MOCK_STATS_DATA } from '../../__tests__/mock-data';

const useStats = jest.fn(() => ({
  stats: MOCK_STATS_DATA,
  loading: false,
  error: null,
  date: new Date('2024-01-01T12:00:00.000Z'),
  setDate: jest.fn(),
  reload: jest.fn(),
}));

export default useStats;