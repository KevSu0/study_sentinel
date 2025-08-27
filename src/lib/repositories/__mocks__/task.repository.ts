const todayISO = () => new Date().toISOString().slice(0, 10);

export const taskRepository = {
  getByDate: jest.fn().mockImplementation(async (_date: string) => [
    { id: 't1', title: 'Test Task', date: todayISO(), done: false }
  ]),
  observeByDate: jest.fn().mockImplementation((_date: string, cb: Function) => {
    cb([{ id: 't1', title: 'Test Task', date: todayISO(), done: false }]);
    return () => {};
  }),
};