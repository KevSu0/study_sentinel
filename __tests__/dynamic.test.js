/**
 * @jest-environment jsdom
 */
describe('Dynamic Mode', () => {
  it('should be configured for a dynamic build', () => {
    expect(process.env.CAP_SERVER_URL).toBe('http://192.168.0.2:3000');
  });
});
