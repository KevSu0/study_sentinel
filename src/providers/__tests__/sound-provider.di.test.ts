import { SoundProvider, type SoundCaps } from '@/providers/sound-provider';

test('no-context branch does not throw', () => {
  const caps: SoundCaps = { getAudioContext: () => null };
  const sp = new SoundProvider(caps);
  sp.setEnabled(true);
  // Should safely no-op when no audio context
  sp.playNotification('tick');
});

test('oscillator creation throws is handled gracefully', () => {
  const fakeCtx: any = {
    createOscillator: () => { throw new Error('no osc'); },
    createGain: () => ({ connect: () => ({ connect: () => ({}) }) }),
    destination: {},
  };
  const caps: SoundCaps = { getAudioContext: () => fakeCtx };
  const sp = new SoundProvider(caps);
  sp.setEnabled(true);
  expect(() => sp.playNotification('alarm')).not.toThrow();
});

test('success path schedules stop on oscillator', () => {
  const stopped: boolean[] = [];
  const osc = { connect: () => ({ connect: () => ({}) }), start: () => {}, stop: () => { stopped.push(true); } };
  const fakeCtx: any = {
    createOscillator: () => osc,
    createGain: () => ({ connect: () => ({ connect: () => ({}) }) }),
    destination: {},
    currentTime: 0,
  };
  const caps: SoundCaps = { getAudioContext: () => fakeCtx };
  const sp = new SoundProvider(caps);
  sp.setEnabled(true);
  jest.useFakeTimers();
  sp.playNotification('success');
  jest.runOnlyPendingTimers();
  expect(stopped.length).toBe(1);
  jest.useRealTimers();
});

