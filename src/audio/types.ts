export type InstrumentType =
  | 'kick'
  | 'snare'
  | 'hihat_closed'
  | 'hihat_open'
  | 'clap'
  | 'perc'
  | 'crash'
  | 'bass808'
  | 'lead_saw'
  | 'pluck'
  | 'pad'
  | 'rhodes'
  | 'acid';

export interface Note {
  id: string;
  pitch: string; // e.g. "C4", "D#4"
  midi: number;  // 36 (C2) to 84 (C6)
  step: number;  // 0 to 31
  duration: number; // in steps (e.g. 1 = 16th, 2 = 8th, 4 = quarter)
  velocity: number; // 0 to 1
}

export interface Channel {
  id: string;
  name: string;
  type: InstrumentType;
  color: string;
  mixerTrack: number; // 1 to 8
  volume: number; // 0 to 1.5, default 0.8
  pan: number; // -1 to 1, default 0
  muted: boolean;
  solo: boolean;
  steps: boolean[]; // 16 or 32 steps
  notes: Note[]; // detailed piano roll notes
  octaveOffset?: number;
}

export interface Pattern {
  id: string;
  name: string;
  channels: Channel[];
}

export interface PlaylistClip {
  id: string;
  patternId: string;
  trackIndex: number; // 0 to 7
  startBar: number;   // 1-indexed, e.g. 1, 2, 3...
  durationBars: number; // e.g. 1, 2, 4
  color?: string;
}

export interface MixerTrack {
  id: number; // 0 = Master, 1..8 = Inserts
  name: string;
  volume: number; // 0 to 1.5, default 0.8
  pan: number; // -1 to 1, default 0
  muted: boolean;
  solo: boolean;
  eq: {
    low: number;  // -12 to +12 dB
    mid: number;  // -12 to +12 dB
    high: number; // -12 to +12 dB
  };
  delay: {
    enabled: boolean;
    time: number; // 0.1s to 0.8s
    feedback: number; // 0 to 0.85
    mix: number; // 0 to 1
  };
  reverb: {
    enabled: boolean;
    decay: number; // 0.5s to 4s
    mix: number; // 0 to 1
  };
  distortion: {
    enabled: boolean;
    amount: number; // 0 to 1
  };
}

export type PlaybackMode = 'pattern' | 'song';
export type ActiveWindow = 'rack' | 'pianoroll' | 'playlist' | 'mixer';
