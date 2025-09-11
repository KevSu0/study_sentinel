import {
  motivationalQuotes,
  motivationalMessages,
  getRandomMotivationalMessage,
} from '../motivation';

describe('Motivation Library', () => {
  describe('motivationalQuotes', () => {
    it('should be a non-empty array of strings', () => {
      expect(Array.isArray(motivationalQuotes)).toBe(true);
      expect(motivationalQuotes.length).toBeGreaterThan(0);
      motivationalQuotes.forEach(quote => {
        expect(typeof quote).toBe('string');
        expect(quote.length).toBeGreaterThan(0);
      });
    });
  });

  describe('motivationalMessages', () => {
    it('should be a non-empty array of strings', () => {
      expect(Array.isArray(motivationalMessages)).toBe(true);
      expect(motivationalMessages.length).toBeGreaterThan(0);
      motivationalMessages.forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getRandomMotivationalMessage', () => {
    it('should return a string from the motivationalMessages array', () => {
      const message = getRandomMotivationalMessage();
      expect(typeof message).toBe('string');
      expect(motivationalMessages).toContain(message);
    });

    describe('with mocked Math.random', () => {
      it('should return the first message when Math.random returns 0', () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
        const message = getRandomMotivationalMessage();
        expect(message).toBe(motivationalMessages[0]);
        randomSpy.mockRestore();
      });

      it('should return the last message when Math.random returns a value close to 1', () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999999999);
        const message = getRandomMotivationalMessage();
        const lastIndex = motivationalMessages.length - 1;
        expect(message).toBe(motivationalMessages[lastIndex]);
        randomSpy.mockRestore();
      });

      it('should return a message from the middle of the array', () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const message = getRandomMotivationalMessage();
        const middleIndex = Math.floor(0.5 * motivationalMessages.length);
        expect(message).toBe(motivationalMessages[middleIndex]);
        randomSpy.mockRestore();
      });
    });

    it('should handle an empty array gracefully by returning undefined', () => {
        // This is a safe way to test this in Jest, though not ideal.
        // We temporarily modify the imported array for this single test.
        const originalMessages = [...motivationalMessages];
        (motivationalMessages as string[]).length = 0; // Modify in place

        const message = getRandomMotivationalMessage();
        expect(message).toBeUndefined();

        // Restore the original array to not affect other tests
        motivationalMessages.push(...originalMessages);
    });
  });
});