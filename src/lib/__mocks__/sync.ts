export class SyncEngine {
  start = jest.fn();
  stop = jest.fn();
  synchronize = jest.fn().mockResolvedValue(undefined);
}