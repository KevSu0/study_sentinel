export const resolved = <T>(value: T) =>
  jest.fn<Promise<T>, []>().mockResolvedValue(value);
