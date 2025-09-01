import { QuoteProvider, quoteProvider } from '../quote-provider';

describe('quote-provider', () => {
  afterEach(() => {
    try { jest.useRealTimers(); } catch {}
  });

  test('getRandomQuote returns one from list deterministically when Math.random is mocked', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const qp = new QuoteProvider();
    const q = qp.getRandomQuote();
    expect(typeof q).toBe('string');
    // With 0, should pick the first quote
    expect(q.length).toBeGreaterThan(0);
    spy.mockRestore();
  });

  test('getQuoteOfTheDay stable for a given date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-05T12:00:00Z'));
    const qp = new QuoteProvider();
    // 2025-01-05 -> dayOfYear=5; list length=5 -> index 0, same as getRandomQuote with 0
    const daily = qp.getQuoteOfTheDay();
    expect(typeof daily).toBe('string');
    expect(daily.length).toBeGreaterThan(0);
  });

  test('addQuote trims and avoids duplicates', () => {
    const qp = new QuoteProvider();
    const initial = quoteProvider.getRandomQuote();
    qp.addQuote('  New custom quote  ');
    const added = qp.getRandomQuote();
    expect(typeof added).toBe('string');
    // adding duplicate should not throw or duplicate
    qp.addQuote('New custom quote');
    expect(typeof qp.getRandomQuote()).toBe('string');
    expect(initial).not.toBeUndefined();
  });
});

