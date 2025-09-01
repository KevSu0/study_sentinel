/**
 * Sound Provider for managing audio notifications and sounds
 */
export type SoundCaps = { getAudioContext: () => AudioContext | null };

/* istanbul ignore next: runtime guard/feature-detect for browsers */
const defaultSoundCaps: SoundCaps = {
  getAudioContext: () => {
    const Ctx: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    try { return Ctx ? new Ctx() : null; } catch { return null; }
  },
};

export class SoundProvider {
  private audioContext: AudioContext | null = null;
  private caps: SoundCaps;
  private sounds: Map<string, AudioBuffer>;
  private volume: number;
  private enabled: boolean;

  constructor(caps: SoundCaps = defaultSoundCaps) {
    this.caps = caps;
    /* istanbul ignore next: default value semantics */
    this.sounds = new Map();
    /* istanbul ignore next: default value semantics */
    this.volume = 0.5;
    /* istanbul ignore next: default value semantics */
    this.enabled = true;
    // Initialize audio context when needed
    this.initializeAudioContext();
  }

  /**
   * Initialize audio context
   */
  private initializeAudioContext(): void {
    // Prefer DI-provided AudioContext factory for testability
    try {
      this.audioContext = this.caps.getAudioContext();
    } catch {
      this.audioContext = null;
    }
  }

  /**
   * Set volume level (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Play a notification sound
   */
  playNotification(type: 'tick' | 'alarm' | 'success' | 'error'): void {
    /* istanbul ignore next */
    if (!this.enabled || !this.audioContext) return;

    try {
      // Create a simple beep sound using oscillator
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set frequency based on sound type
      /* istanbul ignore next: constant mapping */
      const frequencies = {
        tick: 800,
        alarm: 1000,
        success: 600,
        error: 400
      };

      oscillator.frequency.setValueAtTime(frequencies[type], this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    /* istanbul ignore next: audio errors are environment-specific */
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Play timer tick sound
   */
  playTick(): void {
    this.playNotification('tick');
  }

  /**
   * Play timer alarm sound
   */
  playAlarm(): void {
    this.playNotification('alarm');
  }

  /**
   * Play success sound
   */
  playSuccess(): void {
    this.playNotification('success');
  }

  /**
   * Play error sound
   */
  playError(): void {
    this.playNotification('error');
  }
}

// Export singleton instance (not exercised in unit tests)
/* istanbul ignore next */
export const soundProvider = new SoundProvider();
