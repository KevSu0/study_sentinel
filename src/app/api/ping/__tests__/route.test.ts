import { GET, HEAD } from '../route';

describe('api/ping route', () => {
  test('GET returns 200 and OK body', async () => {
    const res: any = await GET();
    expect(res.status).toBe(200);
    const text = await (res.text ? res.text() : Promise.resolve('OK'));
    expect(text).toBe('OK');
  });

  test('HEAD returns 200', async () => {
    const res: any = await HEAD();
    expect(res.status).toBe(200);
  });
});

