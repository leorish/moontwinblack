/**
 * Procedural Gothic Ambient Music & Atmospheric Sound Generator using Web Audio API
 * Generates detuned sine/triangle oscillators on an A minor chord (A2, E3, C4)
 * routed through a low-pass filter modulated by a slow LFO and cavernous feedback delay.
 * Includes randomized subtle ambient effects: distant wind chimes, faint night owl hoots,
 * and petal detachment interactive whispers.
 */

class GothicAmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private baseVolume: number = 0.15;
  private ambientTimerId: number | null = null;

  public init(volume: number = 0.15): void {
    if (this.isInitialized) return;
    this.baseVolume = volume;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      // Smooth 4-second fade in
      this.masterGain.gain.exponentialRampToValueAtTime(this.baseVolume, this.ctx.currentTime + 4.0);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain bus attached to master gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Low-pass Filter (600 - 900 Hz range)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Slow LFO for breathing filter resonance (~8s cycle)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(190, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Feedback Delay simulated dark gothic cathedral reverb
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.38, this.ctx.currentTime);

      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.42, this.ctx.currentTime);

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);

      filter.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(feedback);
      feedback.connect(delay);
      delayFilter.connect(this.masterGain);
      filter.connect(this.masterGain);

      // A Minor Chord Oscillators (A2 = 110Hz, E3 = 164.81Hz, C4 = 261.63Hz + sub-bass A1 = 55Hz)
      const chord = [
        { freq: 110.0, type: 'triangle' as OscillatorType, detune: 2.5, gain: 0.32 },
        { freq: 164.81, type: 'sine' as OscillatorType, detune: -3.0, gain: 0.28 },
        { freq: 261.63, type: 'sine' as OscillatorType, detune: 1.5, gain: 0.22 },
        { freq: 55.0, type: 'sine' as OscillatorType, detune: 0, gain: 0.18 },
      ];

      chord.forEach(({ freq, type, detune, gain }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.detune.setValueAtTime(detune, this.ctx.currentTime);
        oscGain.gain.setValueAtTime(gain, this.ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
      });

      this.isInitialized = true;
      this.scheduleNextAtmosphericSound();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  /**
   * Schedules randomized, extremely subtle gothic sounds (distant wind chimes or faint owl hoots)
   */
  private scheduleNextAtmosphericSound(): void {
    if (this.ambientTimerId) {
      window.clearTimeout(this.ambientTimerId);
    }
    // Random delay between 14 and 28 seconds
    const delayMs = 14000 + Math.random() * 14000;
    this.ambientTimerId = window.setTimeout(() => {
      if (this.ctx && !this.isMuted) {
        if (Math.random() < 0.6) {
          this.playDistantWindChimes();
        } else {
          this.playFaintOwlHoot();
        }
      }
      this.scheduleNextAtmosphericSound();
    }, delayMs);
  }

  /**
   * Distant wind chimes: 2-4 randomized delicate metallic pings
   */
  public playDistantWindChimes(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0]; // C6 - C7 pentatonic
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const strikeTime = now + i * (0.15 + Math.random() * 0.25);
      const freq = notes[Math.floor(Math.random() * notes.length)] * (1 + (Math.random() - 0.5) * 0.02);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const bpf = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, strikeTime);

      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(freq, strikeTime);
      bpf.Q.setValueAtTime(14, strikeTime);

      const chimeVol = 0.018 + Math.random() * 0.015;
      gain.gain.setValueAtTime(0.0001, strikeTime);
      gain.gain.linearRampToValueAtTime(chimeVol, strikeTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 2.2 + Math.random() * 0.8);

      osc.connect(bpf);
      bpf.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(strikeTime);
      osc.stop(strikeTime + 3.2);
    }
  }

  /**
   * Faint night owl hoot: distant, soft two-tone call (G4 falling gently to E4)
   */
  public playFaintOwlHoot(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lpf = this.ctx.createBiquadFilter();

    // Two-stage hollow hoot
    osc.type = 'triangle';
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(480, now);
    lpf.Q.setValueAtTime(3.0, now);

    // Tone sequence: 392Hz (G4) -> 330Hz (E4)
    osc.frequency.setValueAtTime(390, now);
    osc.frequency.exponentialRampToValueAtTime(410, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(328, now + 0.7);

    // Very gentle distant volume
    const owlVol = 0.022;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(owlVol, now + 0.2);
    gain.gain.linearRampToValueAtTime(owlVol * 0.4, now + 0.45);
    gain.gain.linearRampToValueAtTime(owlVol * 0.9, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.8);
  }

  /**
   * Subtle velvety petal detachment sound effect
   */
  public playPetalDetachSound(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public toggleMute(): boolean {
    if (!this.ctx || !this.masterGain) {
      this.init();
      this.isMuted = false;
      return false;
    }

    this.isMuted = !this.isMuted;
    const target = this.isMuted ? 0.0001 : this.baseVolume;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public isRunning(): boolean {
    return this.isInitialized;
  }
}

export const ambientMusic = new GothicAmbientAudio();
