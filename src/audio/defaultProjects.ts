import { Channel, Pattern, PlaylistClip, MixerTrack } from './types';

export function createDefaultChannels(): Channel[] {
  return [
    {
      id: 'ch-kick',
      name: '808 Kick',
      type: 'kick',
      color: '#f97316', // Orange
      mixerTrack: 1,
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      steps: [
        true, false, false, false,
        false, false, true, false,
        true, false, false, false,
        false, false, true, false,
      ],
      notes: [],
    },
    {
      id: 'ch-snare',
      name: 'Trap Snare',
      type: 'snare',
      color: '#06b6d4', // Cyan
      mixerTrack: 2,
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      steps: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      notes: [],
    },
    {
      id: 'ch-hihat',
      name: 'Hat Closed',
      type: 'hihat_closed',
      color: '#eab308', // Amber/Yellow
      mixerTrack: 3,
      volume: 0.75,
      pan: 0.1,
      muted: false,
      solo: false,
      steps: [
        true, true, true, true,
        true, true, true, true,
        true, true, true, true,
        true, true, true, true,
      ],
      notes: [],
    },
    {
      id: 'ch-clap',
      name: 'Studio Clap',
      type: 'clap',
      color: '#ec4899', // Pink
      mixerTrack: 4,
      volume: 0.8,
      pan: -0.05,
      muted: false,
      solo: false,
      steps: [
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
      ],
      notes: [],
    },
    {
      id: 'ch-808',
      name: '808 Sub-Bass',
      type: 'bass808',
      color: '#84cc16', // Lime
      mixerTrack: 5,
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      steps: [
        true, false, false, false,
        false, false, true, false,
        false, false, false, false,
        false, true, false, false,
      ],
      notes: [
        { id: 'n1', pitch: 'C2', midi: 36, step: 0, duration: 4, velocity: 0.95 },
        { id: 'n2', pitch: 'G2', midi: 43, step: 6, duration: 4, velocity: 0.9 },
        { id: 'n3', pitch: 'F2', midi: 41, step: 13, duration: 3, velocity: 0.88 },
      ],
    },
    {
      id: 'ch-lead',
      name: 'Fruity Pluck',
      type: 'pluck',
      color: '#a855f7', // Purple
      mixerTrack: 6,
      volume: 0.75,
      pan: -0.15,
      muted: false,
      solo: false,
      steps: new Array(16).fill(false),
      notes: [
        { id: 'p1', pitch: 'C4', midi: 60, step: 0, duration: 2, velocity: 0.85 },
        { id: 'p2', pitch: 'D#4', midi: 63, step: 2, duration: 2, velocity: 0.8 },
        { id: 'p3', pitch: 'G4', midi: 67, step: 4, duration: 2, velocity: 0.9 },
        { id: 'p4', pitch: 'A#4', midi: 70, step: 7, duration: 2, velocity: 0.85 },
        { id: 'p5', pitch: 'G4', midi: 67, step: 10, duration: 2, velocity: 0.8 },
        { id: 'p6', pitch: 'F4', midi: 65, step: 12, duration: 2, velocity: 0.85 },
        { id: 'p7', pitch: 'D#4', midi: 63, step: 14, duration: 2, velocity: 0.8 },
      ],
    },
    {
      id: 'ch-rhodes',
      name: 'Warm Keys',
      type: 'rhodes',
      color: '#3b82f6', // Blue
      mixerTrack: 7,
      volume: 0.7,
      pan: 0.2,
      muted: false,
      solo: false,
      steps: new Array(16).fill(false),
      notes: [
        { id: 'rk1', pitch: 'C4', midi: 60, step: 0, duration: 6, velocity: 0.75 },
        { id: 'rk2', pitch: 'D#4', midi: 63, step: 0, duration: 6, velocity: 0.75 },
        { id: 'rk3', pitch: 'G4', midi: 67, step: 0, duration: 6, velocity: 0.75 },
        { id: 'rk4', pitch: 'A#3', midi: 58, step: 8, duration: 6, velocity: 0.75 },
        { id: 'rk5', pitch: 'D4', midi: 62, step: 8, duration: 6, velocity: 0.75 },
        { id: 'rk6', pitch: 'F4', midi: 65, step: 8, duration: 6, velocity: 0.75 },
      ],
    },
  ];
}

export function createDefaultMixerTracks(): MixerTrack[] {
  const tracks: MixerTrack[] = [
    {
      id: 0,
      name: 'Master',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      eq: { low: 0, mid: 0, high: 0 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0 },
      reverb: { enabled: false, decay: 1.5, mix: 0 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 1,
      name: 'Kick Track',
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      eq: { low: 2.5, mid: -1.0, high: 1.0 },
      delay: { enabled: false, time: 0.2, feedback: 0.2, mix: 0.1 },
      reverb: { enabled: false, decay: 0.8, mix: 0.05 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 2,
      name: 'Snare Track',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      eq: { low: -2.0, mid: 1.5, high: 2.0 },
      delay: { enabled: false, time: 0.25, feedback: 0.25, mix: 0.1 },
      reverb: { enabled: true, decay: 1.2, mix: 0.18 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 3,
      name: 'Hi-Hats',
      volume: 0.75,
      pan: 0.1,
      muted: false,
      solo: false,
      eq: { low: -6.0, mid: 0, high: 3.5 },
      delay: { enabled: false, time: 0.2, feedback: 0.3, mix: 0.15 },
      reverb: { enabled: false, decay: 1.0, mix: 0.1 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 4,
      name: 'Clap Track',
      volume: 0.8,
      pan: -0.05,
      muted: false,
      solo: false,
      eq: { low: -3.0, mid: 1.0, high: 2.0 },
      delay: { enabled: false, time: 0.3, feedback: 0.2, mix: 0.1 },
      reverb: { enabled: true, decay: 1.6, mix: 0.22 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 5,
      name: '808 Bass',
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      eq: { low: 3.0, mid: -2.0, high: -4.0 },
      delay: { enabled: false, time: 0.3, feedback: 0.1, mix: 0.05 },
      reverb: { enabled: false, decay: 0.5, mix: 0 },
      distortion: { enabled: true, amount: 0.15 },
    },
    {
      id: 6,
      name: 'Pluck Synth',
      volume: 0.8,
      pan: -0.15,
      muted: false,
      solo: false,
      eq: { low: -2.0, mid: 1.5, high: 2.5 },
      delay: { enabled: true, time: 0.35, feedback: 0.4, mix: 0.28 },
      reverb: { enabled: true, decay: 2.0, mix: 0.25 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 7,
      name: 'Keys / Rhodes',
      volume: 0.75,
      pan: 0.2,
      muted: false,
      solo: false,
      eq: { low: 0, mid: 1.0, high: 1.5 },
      delay: { enabled: true, time: 0.4, feedback: 0.3, mix: 0.2 },
      reverb: { enabled: true, decay: 2.4, mix: 0.3 },
      distortion: { enabled: false, amount: 0 },
    },
    {
      id: 8,
      name: 'FX & Aux',
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      eq: { low: 0, mid: 0, high: 0 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0 },
      reverb: { enabled: false, decay: 1.5, mix: 0 },
      distortion: { enabled: false, amount: 0 },
    },
  ];
  return tracks;
}

export function createDefaultPatterns(): Pattern[] {
  const p1Channels = createDefaultChannels();

  // Pattern 2: Drum Variation with open hats and tom perc
  const p2Channels = createDefaultChannels().map((ch) => {
    if (ch.id === 'ch-kick') {
      return {
        ...ch,
        steps: [
          true, false, true, false,
          false, false, true, false,
          true, false, false, false,
          true, false, false, true,
        ],
      };
    }
    if (ch.id === 'ch-snare') {
      return {
        ...ch,
        steps: [
          false, false, false, false,
          true, false, false, false,
          false, false, false, false,
          true, false, true, true,
        ],
      };
    }
    return ch;
  });

  // Pattern 3: Melody Solo
  const p3Channels = createDefaultChannels().map((ch) => {
    if (ch.type === 'kick' || ch.type === 'snare' || ch.type === 'clap') {
      return { ...ch, steps: new Array(16).fill(false) };
    }
    return ch;
  });

  return [
    { id: 'pat-1', name: 'Pattern 1 (Main Beat)', channels: p1Channels },
    { id: 'pat-2', name: 'Pattern 2 (Drum Roll)', channels: p2Channels },
    { id: 'pat-3', name: 'Pattern 3 (Melody Drop)', channels: p3Channels },
  ];
}

export function createDefaultClips(): PlaylistClip[] {
  return [
    // Track 0: Intro & Drums
    { id: 'clip-1', patternId: 'pat-1', trackIndex: 0, startBar: 1, durationBars: 4, color: '#f97316' },
    { id: 'clip-2', patternId: 'pat-1', trackIndex: 0, startBar: 5, durationBars: 4, color: '#f97316' },
    { id: 'clip-3', patternId: 'pat-2', trackIndex: 0, startBar: 9, durationBars: 4, color: '#06b6d4' },
    { id: 'clip-4', patternId: 'pat-1', trackIndex: 0, startBar: 13, durationBars: 4, color: '#f97316' },

    // Track 1: Melody & Chords
    { id: 'clip-5', patternId: 'pat-3', trackIndex: 1, startBar: 1, durationBars: 4, color: '#a855f7' },
    { id: 'clip-6', patternId: 'pat-1', trackIndex: 1, startBar: 5, durationBars: 4, color: '#a855f7' },
    { id: 'clip-7', patternId: 'pat-1', trackIndex: 1, startBar: 9, durationBars: 4, color: '#a855f7' },
    { id: 'clip-8', patternId: 'pat-3', trackIndex: 1, startBar: 13, durationBars: 4, color: '#a855f7' },
  ];
}
