import { InstrumentType, MixerTrack } from './types';

// Convert MIDI note number to frequency in Hertz
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert note pitch string to MIDI number
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60; // C4 default
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

export function midiToPitch(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Mixer track nodes: index 0 = Master, 1..8 = Inserts
  private trackNodes: Map<
    number,
    {
      input: GainNode;
      output: GainNode;
      panner: StereoPannerNode;
      eqLow: BiquadFilterNode;
      eqMid: BiquadFilterNode;
      eqHigh: BiquadFilterNode;
      delayInput: GainNode;
      delayNode: DelayNode;
      delayFeedback: GainNode;
      reverbInput: GainNode;
      convolver: ConvolverNode;
      distortionNode: WaveShaperNode;
      analyser: AnalyserNode;
    }
  > = new Map();

  constructor() {
    // Lazy initialized on first user interaction
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initMasterGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private initMasterGraph() {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-1.5, this.ctx.currentTime);
    this.masterCompressor.knee.setValueAtTime(6, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize 8 Mixer Insert Tracks
    for (let i = 1; i <= 8; i++) {
      this.setupTrack(i);
    }
  }

  private setupTrack(trackId: number) {
    if (!this.ctx || !this.masterGain) return;

    const input = this.ctx.createGain();
    const output = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    // 3-Band EQ
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = 0;

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1500;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = 0;

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 6500;
    eqHigh.gain.value = 0;

    // Delay FX
    const delayInput = this.ctx.createGain();
    delayInput.gain.value = 0;
    const delayNode = this.ctx.createDelay(2.0);
    delayNode.delayTime.value = 0.3;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.35;
    delayInput.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // Reverb FX (Impulse response)
    const reverbInput = this.ctx.createGain();
    reverbInput.gain.value = 0;
    const convolver = this.ctx.createConvolver();
    convolver.buffer = this.createReverbImpulse(1.8, 2.0);
    reverbInput.connect(convolver);

    // Distortion FX
    const distortionNode = this.ctx.createWaveShaper();
    distortionNode.curve = this.makeDistortionCurve(0);
    distortionNode.oversample = '2x';

    // Track analyser for VU meter
    const trackAnalyser = this.ctx.createAnalyser();
    trackAnalyser.fftSize = 64;

    // Chain: Input -> Distortion -> EQ Low -> EQ Mid -> EQ High -> Panner -> Output -> Master
    input.connect(distortionNode);
    distortionNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);

    // Send to FX sends
    eqHigh.connect(delayInput);
    eqHigh.connect(reverbInput);

    // Reconnect effects back to output
    delayNode.connect(output);
    convolver.connect(output);

    eqHigh.connect(panner);
    panner.connect(output);
    output.connect(trackAnalyser);
    output.connect(this.masterGain);

    this.trackNodes.set(trackId, {
      input,
      output,
      panner,
      eqLow,
      eqMid,
      eqHigh,
      delayInput,
      delayNode,
      delayFeedback,
      reverbInput,
      convolver,
      distortionNode,
      analyser: trackAnalyser,
    });
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      left[i] = ((Math.random() * 2 - 1) * Math.pow(n / length, decay));
      right[i] = ((Math.random() * 2 - 1) * Math.pow(n / length, decay));
    }
    return impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount * 50;
    const n_samples = 44100;
    const buffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  public updateMixerTrack(track: MixerTrack) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (track.id === 0) {
      // Master
      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(track.muted ? 0 : track.volume, now);
      }
      return;
    }

    const nodes = this.trackNodes.get(track.id);
    if (!nodes) return;

    nodes.output.gain.setValueAtTime(track.muted ? 0 : track.volume, now);
    nodes.panner.pan.setValueAtTime(track.pan, now);

    nodes.eqLow.gain.setValueAtTime(track.eq.low, now);
    nodes.eqMid.gain.setValueAtTime(track.eq.mid, now);
    nodes.eqHigh.gain.setValueAtTime(track.eq.high, now);

    nodes.delayInput.gain.setValueAtTime(track.delay.enabled ? track.delay.mix : 0, now);
    nodes.delayNode.delayTime.setValueAtTime(track.delay.time, now);
    nodes.delayFeedback.gain.setValueAtTime(track.delay.feedback, now);

    nodes.reverbInput.gain.setValueAtTime(track.reverb.enabled ? track.reverb.mix : 0, now);

    if (track.distortion.enabled && track.distortion.amount > 0) {
      nodes.distortionNode.curve = this.makeDistortionCurve(track.distortion.amount);
    } else {
      nodes.distortionNode.curve = this.makeDistortionCurve(0);
    }
  }

  public getTrackNode(trackId: number): GainNode {
    this.getContext();
    const nodes = this.trackNodes.get(trackId);
    if (nodes) return nodes.input;
    return this.masterGain!;
  }

  public getMasterAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getTrackAnalyser(trackId: number): AnalyserNode | null {
    const nodes = this.trackNodes.get(trackId);
    return nodes ? nodes.analyser : null;
  }

  // --- INSTRUMENT SYNTHESIS TRIGGER ---
  public triggerSound(
    type: InstrumentType,
    midiNote = 60,
    time?: number,
    duration = 0.25,
    velocity = 0.8,
    mixerTrackId = 1,
    volume = 1.0,
    pan = 0
  ) {
    const ctx = this.getContext();
    const targetTime = time !== undefined ? time : ctx.currentTime;
    const dest = this.getTrackNode(mixerTrackId);

    // Channel gain & pan
    const chGain = ctx.createGain();
    chGain.gain.setValueAtTime(velocity * volume, targetTime);

    const chPan = ctx.createStereoPanner();
    chPan.pan.setValueAtTime(pan, targetTime);

    chGain.connect(chPan);
    chPan.connect(dest);

    switch (type) {
      case 'kick':
        this.playKick(ctx, chGain, targetTime);
        break;
      case 'snare':
        this.playSnare(ctx, chGain, targetTime);
        break;
      case 'hihat_closed':
        this.playHiHatClosed(ctx, chGain, targetTime);
        break;
      case 'hihat_open':
        this.playHiHatOpen(ctx, chGain, targetTime);
        break;
      case 'clap':
        this.playClap(ctx, chGain, targetTime);
        break;
      case 'perc':
        this.playPerc(ctx, chGain, targetTime, midiNote);
        break;
      case 'crash':
        this.playCrash(ctx, chGain, targetTime);
        break;
      case 'bass808':
        this.play808Bass(ctx, chGain, targetTime, midiNote, duration);
        break;
      case 'lead_saw':
        this.playSawLead(ctx, chGain, targetTime, midiNote, duration);
        break;
      case 'pluck':
        this.playPluck(ctx, chGain, targetTime, midiNote, duration);
        break;
      case 'pad':
        this.playPad(ctx, chGain, targetTime, midiNote, duration);
        break;
      case 'rhodes':
        this.playRhodes(ctx, chGain, targetTime, midiNote, duration);
        break;
      case 'acid':
        this.playAcid(ctx, chGain, targetTime, midiNote, duration);
        break;
      default:
        this.playPluck(ctx, chGain, targetTime, midiNote, duration);
        break;
    }
  }

  // --- SYNTHESIZER IMPLEMENTATIONS ---

  private playKick(ctx: AudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pitch envelope drop: 150Hz -> 38Hz
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    // Amplitude envelope
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    // Click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(450, time);
    clickOsc.frequency.exponentialRampToValueAtTime(80, time + 0.02);
    clickGain.gain.setValueAtTime(0.8, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

    clickOsc.connect(clickGain);
    clickGain.connect(dest);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  private playSnare(ctx: AudioContext, dest: AudioNode, time: number) {
    // Body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.08);
    oscGain.gain.setValueAtTime(0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.16);

    // White noise rattle
    const bufferSize = ctx.sampleRate * 0.22;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.23);
  }

  private playHiHatClosed(ctx: AudioContext, dest: AudioNode, time: number) {
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8200, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.06);
  }

  private playHiHatOpen(ctx: AudioContext, dest: AudioNode, time: number) {
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.35);
  }

  private playClap(ctx: AudioContext, dest: AudioNode, time: number) {
    // 3 quick micro-bursts followed by sustained tail
    const bursts = [0, 0.012, 0.024];
    bursts.forEach((offset, idx) => {
      const isLast = idx === bursts.length - 1;
      const dur = isLast ? 0.18 : 0.015;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, time + offset);
      filter.Q.setValueAtTime(2.0, time + offset);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isLast ? 0.9 : 0.6, time + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, time + offset + dur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      source.start(time + offset);
      source.stop(time + offset + dur + 0.01);
    });
  }

  private playPerc(ctx: AudioContext, dest: AudioNode, time: number, midi = 62) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = midiToFreq(midi);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.8, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.04);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playCrash(ctx: AudioContext, dest: AudioNode, time: number) {
    const duration = 1.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + duration);
  }

  private play808Bass(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi <= 48 ? midi : 36 + (midi % 12));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Punchy pitch drop at start
    osc.frequency.setValueAtTime(freq * 1.35, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

    const safeDuration = Math.max(0.2, duration);
    gain.gain.setValueAtTime(0.95, time);
    gain.gain.setValueAtTime(0.85, time + safeDuration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration + 0.1);

    // Warm wave saturation
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(0.12);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + safeDuration + 0.15);
  }

  private playSawLead(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    // Detune by +8 cents and -8 cents
    osc1.detune.setValueAtTime(8, time);
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(-8, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, time);
    filter.Q.setValueAtTime(3, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), time + duration);

    const safeDuration = Math.max(0.1, duration);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.setValueAtTime(0.35, time + safeDuration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration + 0.08);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + safeDuration + 0.1);
    osc2.stop(time + safeDuration + 0.1);
  }

  private playPluck(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(10000, freq * 6), time);
    filter.Q.setValueAtTime(5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.1, time + 0.18);

    const safeDuration = Math.min(duration, 0.35);
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + safeDuration + 0.02);
  }

  private playPad(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(10, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, time);
    filter.Q.setValueAtTime(1.5, time);

    // Warm slow attack
    const safeDuration = Math.max(0.4, duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.12);
    gain.gain.setValueAtTime(0.3, time + safeDuration * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration + 0.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + safeDuration + 0.3);
    osc2.stop(time + safeDuration + 0.3);
  }

  private playRhodes(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi);
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();

    // FM synthesis bell transient
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, time);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2, time);

    modGain.gain.setValueAtTime(freq * 1.5, time);
    modGain.gain.exponentialRampToValueAtTime(1, time + 0.2);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const safeDuration = Math.max(0.2, duration);
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration + 0.1);

    carrier.connect(gain);
    gain.connect(dest);

    carrier.start(time);
    modulator.start(time);
    carrier.stop(time + safeDuration + 0.15);
    modulator.stop(time + safeDuration + 0.15);
  }

  private playAcid(ctx: AudioContext, dest: AudioNode, time: number, midi: number, duration: number) {
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(12, time);
    filter.frequency.setValueAtTime(freq * 8, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.18);

    const safeDuration = Math.max(0.12, duration);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + safeDuration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + safeDuration + 0.05);
  }

  // Metronome tick sound
  public playMetronomeTick(time?: number, isDownbeat = false) {
    const ctx = this.getContext();
    const t = time !== undefined ? time : ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1600 : 900, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

// Singleton engine instance
export const engine = new AudioEngine();
