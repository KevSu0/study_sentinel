import { loadJSON, saveJSON } from '../use-state-persistence';

describe('use-state-persistence helpers', () => {
  beforeEach(() => {
    // @ts-ignore
    window.localStorage?.clear?.();
    jest.spyOn(window.localStorage.__proto__, 'getItem');
    jest.spyOn(window.localStorage.__proto__, 'setItem');
  });

  it('safely saves and loads JSON', () => {
    const key = 'test:key';
    const value = { a: 1, b: 'x' };
    expect(loadJSON<typeof value>(key)).toBeNull();
    saveJSON(key, value);
    expect(loadJSON<typeof value>(key)).toEqual(value);
  });

  it('returns null on malformed JSON', () => {
    const key = 'bad:key';
    window.localStorage.setItem(key, 'not-json');
    const val = loadJSON<any>(key);
    expect(val).toBeNull();
  });
});
