import { generateId, generateShortId, generateUUID } from '../id-generator';

describe('id-generator', () => {
  test('generateId format and uniqueness', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
      ids.add(id);
    }
    expect(ids.size).toBe(20);
  });

  test('generateShortId length and variability', () => {
    const a = generateShortId();
    const b = generateShortId();
    expect(a).toHaveLength(8);
    expect(b).toHaveLength(8);
    expect(a).not.toBe(b);
  });

  test('generateUUID v4-like pattern', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

