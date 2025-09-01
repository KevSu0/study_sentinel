/**
 * Sound Provider for managing audio notifications and sounds
 */
export class SoundProvider {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private volume: number = 0.5;
  private enabled: boolean = true;

  constructor() {
    // Initialize audio context when needed
    this.initializeAudioContext();
  }

  /**
   * Initialize audio context
   */
  private initializeAudioContext(): void {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
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
  playNotification(type: 'tick' | 'alarm' | 'success' | 'error' = 'tick'): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Create a simple beep sound using oscillator
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set frequency based on sound type
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

// Export singleton instance
export const soundProvider = new SoundProvider();