/**
 * Audio disabled as requested.
 */
class SilentAudioEngine {
  public init() {}
  public handleFirstInteraction() {}
  public getHasInteracted(): boolean { return true; }
  public isAudioMuted(): boolean { return true; }
  public toggleMute(): boolean { return false; }
}

export const ambientAudio = new SilentAudioEngine();
