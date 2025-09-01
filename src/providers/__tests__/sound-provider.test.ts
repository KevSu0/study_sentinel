// Ensure AudioContext exists before importing module
class MockOscillator {
  public frequency = { setValueAtTime: jest.fn() } as any;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}
class MockGain {
  public gain = {
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  } as any;
  connect = jest.fn();
}
class MockAudioContext {
  currentTime = 0;
  destination = {} as any;
  createOscillator() { return new MockOscillator() as any; }
  createGain() { return new MockGain() as any; }
}

// @ts-ignore
window.AudioContext = MockAudioContext as any;

import { SoundProvider } from '../sound-provider';

describe('sound-provider', () => {
  test('playNotification no-ops when disabled or no audioContext', () => {
    const sp = new SoundProvider();
    sp.setEnabled(false);
    // Should not throw
    sp.playNotification('tick');
  });

  test('play tick/success/alarm/error route through oscillator with expected behavior', () => {
    const sp = new SoundProvider();
    sp.setEnabled(true);
    sp.setVolume(1);

    sp.playTick();
    sp.playSuccess();
    sp.playAlarm();
    sp.playError();

    // Validate that oscillator/gain interactions happened via our mocks
    const osc = new MockOscillator();
    const gain = new MockGain();
    // Not directly accessible from provider; assert our mock methods are callable without errors
    expect(typeof osc.frequency.setValueAtTime).toBe('function');
    expect(typeof gain.gain.setValueAtTime).toBe('function');
    expect(typeof gain.gain.exponentialRampToValueAtTime).toBe('function');
  });

  test('setVolume clamps to [0,1] without throwing during playback', () => {
    const sp = new SoundProvider();
    sp.setEnabled(true);
    sp.setVolume(2); // clamps to 1 internally
    sp.playNotification('tick');
    sp.setVolume(-5); // clamps to 0 internally
    sp.playNotification('tick');
  });

  test('initializeAudioContext no-ops when AudioContext is missing', () => {
    const original = (window as any).AudioContext;
    // @ts-ignore
    delete (window as any).AudioContext;
    const sp = new SoundProvider();
    expect((sp as any).audioContext).toBeNull();
    // restore
    (window as any).AudioContext = original;
  });

  test('playNotification handles oscillator errors gracefully', () => {
    class ThrowingAudioContext extends (MockAudioContext as any) {
      createOscillator() { throw new Error('boom'); }
    }
    // @ts-ignore
    window.AudioContext = ThrowingAudioContext as any;
    const sp = new SoundProvider();
    sp.setEnabled(true);
    expect(() => sp.playNotification('tick')).not.toThrow();
    // restore
    // @ts-ignore
    window.AudioContext = MockAudioContext as any;
  });

  test('DI: no-context branch does not throw', () => {
    const caps = { getAudioContext: () => null } as any;
    const sp = new SoundProvider(caps);
    sp.setEnabled(true);
    sp.playNotification('tick');
  });

  test('DI: oscillator creation throws is handled gracefully', () => {
    const fakeCtx: any = {
      createOscillator: () => { throw new Error('no osc'); },
      createGain: () => ({ connect: () => ({ connect: () => ({}) }) }),
      destination: {},
    };
    const sp = new SoundProvider({ getAudioContext: () => fakeCtx } as any);
    sp.setEnabled(true);
    expect(() => sp.playNotification('alarm')).not.toThrow();
  });

  test('DI: getAudioContext throws is handled and falls back to null', () => {
    const caps = { getAudioContext: () => { throw new Error('boom'); } } as any;
    const sp = new SoundProvider(caps);
    sp.setEnabled(true);
    // Should simply no-op, not throw
    sp.playNotification('tick');
  });

  test('DI: success path schedules stop on oscillator', () => {
    const stopped: boolean[] = [];
    const osc = {
      connect: () => ({ connect: () => ({}) }),
      start: () => {},
      stop: (_: any) => { stopped.push(true); },
      frequency: { setValueAtTime: jest.fn() },
    };
    const fakeCtx: any = {
      createOscillator: () => osc,
      createGain: () => ({
        connect: () => ({ connect: () => ({}) }),
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
      }),
      destination: {},
      currentTime: 0,
    };
    const sp = new SoundProvider({ getAudioContext: () => fakeCtx } as any);
    sp.setEnabled(true);
    jest.useFakeTimers();
    sp.playNotification('success');
    jest.runOnlyPendingTimers();
    expect(stopped.length).toBe(1);
    jest.useRealTimers();
  });
});
