import { engine } from './synthEngine';
import { Channel, Pattern, PlaylistClip, PlaybackMode } from './types';

export class AudioScheduler {
  private isPlaying = false;
  private bpm = 130;
  private swing = 0; // 0 to 1
  private metronomeEnabled = false;
  private mode: PlaybackMode = 'pattern';

  // Current playback position
  private currentStep = 0; // 0 to 15 (or 31) in pattern mode
  private currentSongStep = 0; // in song mode (16 steps per bar)
  private nextStepTime = 0;
  private scheduleAheadTime = 0.1; // seconds
  private lookaheadInterval = 25; // ms
  private timerId: number | null = null;

  // External data refs
  private activePattern: Pattern | null = null;
  private allPatterns: Map<string, Pattern> = new Map();
  private playlistClips: PlaylistClip[] = [];
  private totalSongBars = 16;

  // Listeners
  private onStepListeners: Set<(step: number, songBar: number) => void> = new Set();
  private onPlayStateChangeListeners: Set<(playing: boolean) => void> = new Set();

  public setBpm(newBpm: number) {
    this.bpm = Math.max(40, Math.min(260, newBpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setSwing(swingVal: number) {
    this.swing = Math.max(0, Math.min(0.8, swingVal));
  }

  public setMetronome(enabled: boolean) {
    this.metronomeEnabled = enabled;
  }

  public isMetronomeEnabled(): boolean {
    return this.metronomeEnabled;
  }

  public setMode(newMode: PlaybackMode) {
    this.mode = newMode;
  }

  public getMode(): PlaybackMode {
    return this.mode;
  }

  public updateProjectData(
    activePattern: Pattern,
    patterns: Pattern[],
    clips: PlaylistClip[],
    totalBars = 16
  ) {
    this.activePattern = activePattern;
    this.allPatterns.clear();
    for (const p of patterns) {
      this.allPatterns.set(p.id, p);
    }
    this.playlistClips = clips;
    this.totalSongBars = Math.max(8, totalBars);
  }

  public subscribeStep(callback: (step: number, songBar: number) => void) {
    this.onStepListeners.add(callback);
    return () => this.onStepListeners.delete(callback);
  }

  public subscribePlayState(callback: (playing: boolean) => void) {
    this.onPlayStateChangeListeners.add(callback);
    return () => this.onPlayStateChangeListeners.delete(callback);
  }

  public start() {
    if (this.isPlaying) return;
    const ctx = engine.getContext();
    this.isPlaying = true;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadInterval);
    this.notifyPlayState(true);
  }

  public stop() {
    if (!this.isPlaying) {
      // If already stopped, reset to step 0
      this.currentStep = 0;
      this.currentSongStep = 0;
      this.notifyStep(0, 1);
      return;
    }
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.currentSongStep = 0;
    this.notifyStep(0, 1);
    this.notifyPlayState(false);
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyPlayState(false);
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public seekSongStep(songStep: number) {
    this.currentSongStep = Math.max(0, songStep);
    this.currentStep = this.currentSongStep % 16;
    const currentBar = Math.floor(this.currentSongStep / 16) + 1;
    this.notifyStep(this.currentStep, currentBar);
  }

  private scheduler() {
    const ctx = engine.getContext();
    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.nextStepTime);
      this.advanceStep();
    }
  }

  private scheduleStep(time: number) {
    // Apply swing timing on odd 16th steps (1, 3, 5, 7, etc.)
    const stepDuration = 60 / this.bpm / 4; // one 16th note in seconds
    const isOddStep = this.currentStep % 2 === 1;
    const swingOffset = isOddStep ? (this.swing * stepDuration * 0.45) : 0;
    const scheduledTime = time + swingOffset;

    const currentBar = Math.floor(this.currentSongStep / 16) + 1;

    // Metronome tick
    if (this.metronomeEnabled && this.currentStep % 4 === 0) {
      const isDownbeat = this.currentStep === 0;
      engine.playMetronomeTick(scheduledTime, isDownbeat);
    }

    if (this.mode === 'pattern') {
      // Play active pattern
      if (this.activePattern) {
        this.playPatternAtStep(this.activePattern, this.currentStep, scheduledTime, stepDuration);
      }
    } else {
      // Song mode: find which clips are active at currentSongStep
      const currentBarIndex = Math.floor(this.currentSongStep / 16) + 1; // 1-indexed bar
      const stepInPattern = this.currentSongStep % 16;

      for (const clip of this.playlistClips) {
        const clipEndBar = clip.startBar + clip.durationBars;
        if (currentBarIndex >= clip.startBar && currentBarIndex < clipEndBar) {
          const pattern = this.allPatterns.get(clip.patternId);
          if (pattern) {
            this.playPatternAtStep(pattern, stepInPattern, scheduledTime, stepDuration);
          }
        }
      }
    }

    // Schedule UI notification slightly before or exactly at audio time
    const uiDelay = Math.max(0, (scheduledTime - engine.getContext().currentTime) * 1000);
    const stepToNotify = this.currentStep;
    const barToNotify = currentBar;
    setTimeout(() => {
      if (this.isPlaying) {
        this.notifyStep(stepToNotify, barToNotify);
      }
    }, uiDelay);
  }

  private playPatternAtStep(pattern: Pattern, step: number, time: number, stepDuration: number) {
    for (const ch of pattern.channels) {
      if (ch.muted) continue;

      // 1. Check step sequencer button trigger
      if (ch.steps && ch.steps[step]) {
        // Trigger default pitch
        const defaultMidi = ch.type.startsWith('bass') ? 36 : 60;
        engine.triggerSound(
          ch.type,
          defaultMidi,
          time,
          stepDuration * 1.5,
          0.85,
          ch.mixerTrack,
          ch.volume,
          ch.pan
        );
      }

      // 2. Check detailed Piano Roll notes
      if (ch.notes && ch.notes.length > 0) {
        for (const note of ch.notes) {
          if (note.step === step) {
            const durationSec = Math.max(0.1, note.duration * stepDuration);
            engine.triggerSound(
              ch.type,
              note.midi,
              time,
              durationSec,
              note.velocity || 0.8,
              ch.mixerTrack,
              ch.volume,
              ch.pan
            );
          }
        }
      }
    }
  }

  private advanceStep() {
    const stepDuration = 60 / this.bpm / 4;
    this.nextStepTime += stepDuration;

    if (this.mode === 'pattern') {
      const patternLength = 16;
      this.currentStep = (this.currentStep + 1) % patternLength;
      this.currentSongStep = this.currentStep;
    } else {
      const totalSteps = this.totalSongBars * 16;
      this.currentSongStep = (this.currentSongStep + 1) % totalSteps;
      this.currentStep = this.currentSongStep % 16;
    }
  }

  private notifyStep(step: number, bar: number) {
    this.onStepListeners.forEach((fn) => fn(step, bar));
  }

  private notifyPlayState(playing: boolean) {
    this.onPlayStateChangeListeners.forEach((fn) => fn(playing));
  }
}

export const scheduler = new AudioScheduler();
