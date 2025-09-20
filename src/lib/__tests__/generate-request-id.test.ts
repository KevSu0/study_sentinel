import { generateRequestId } from '../offline-resilience-manager';

describe('generateRequestId', () => {
  it('emits url-safe identifiers with a 13-digit timestamp and base36 suffix', () => {
    const ids = Array.from({ length: 1000 }, () => generateRequestId());
    ids.forEach((id) => {
      expect(id).toMatch(/^req-\d{13}-[a-z0-9]+$/);
      expect(id).toMatch(/^[a-z0-9-]+$/);
      const [, timestamp] = id.split('-');
      expect(timestamp).toHaveLength(13);
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders lexicographically when timestamps increase', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValue(1737424800000);
    const older = generateRequestId();

    dateSpy.mockReturnValue(1737424801000);
    const newer = generateRequestId();

    expect(older < newer).toBe(true);
    dateSpy.mockRestore();
  });
});
