import { Pattern, PlaylistClip } from './types';
import { midiToFreq } from './synthEngine';

export async function exportSongToWav(
  bpm: number,
  patterns: Pattern[],
  clips: PlaylistClip[],
  totalBars: number,
  mode: 'song' | 'pattern',
  activePattern?: Pattern
): Promise<Blob> {
  const sampleRate = 44100;
  const stepDuration = 60 / bpm / 4; // seconds per 16th note
  const barsToRender = mode === 'pattern' ? 1 : Math.max(1, totalBars);
  const totalSteps = barsToRender * 16;
  const durationSeconds = totalSteps * stepDuration + 1.0; // add 1 second tail for reverb/delay
  const lengthSamples = Math.ceil(durationSeconds * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, lengthSamples, sampleRate);

  // Master compressor / limiter
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-2, 0);
  compressor.ratio.setValueAtTime(4, 0);

  masterGain.connect(compressor);
  compressor.connect(offlineCtx.destination);

  // Helper to schedule notes onto offline context
  const scheduleNote = (
    type: string,
    midi: number,
    time: number,
    duration: number,
    velocity: number,
    volume: number,
    pan: number
  ) => {
    const chGain = offlineCtx.createGain();
    chGain.gain.setValueAtTime(velocity * volume, time);

    const chPan = offlineCtx.createStereoPanner();
    chPan.pan.setValueAtTime(pan, time);

    chGain.connect(chPan);
    chPan.connect(masterGain);

    if (type === 'kick') {
      const osc = offlineCtx.createOscillator();
      const g = offlineCtx.createGain();
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
      g.gain.setValueAtTime(1.0, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

      osc.connect(g);
      g.connect(chGain);
      osc.start(time);
      osc.stop(time + 0.4);
    } else if (type === 'snare') {
      const osc = offlineCtx.createOscillator();
      const oscGain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(110, time + 0.08);
      oscGain.gain.setValueAtTime(0.7, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(oscGain);
      oscGain.connect(chGain);
      osc.start(time);
      osc.stop(time + 0.16);

      const bufSize = Math.floor(sampleRate * 0.2);
      const buf = offlineCtx.createBuffer(1, bufSize, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = buf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, time);
      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.setValueAtTime(0.9, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(chGain);
      noise.start(time);
      noise.stop(time + 0.21);
    } else if (type === 'hihat_closed') {
      const bufSize = Math.floor(sampleRate * 0.05);
      const buf = offlineCtx.createBuffer(1, bufSize, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = buf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(8200, time);
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.7, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(filter);
      filter.connect(g);
      g.connect(chGain);
      noise.start(time);
      noise.stop(time + 0.055);
    } else if (type === 'hihat_open' || type === 'crash') {
      const dur = type === 'crash' ? 1.2 : 0.3;
      const bufSize = Math.floor(sampleRate * dur);
      const buf = offlineCtx.createBuffer(1, bufSize, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = buf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5500, time);
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.65, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      noise.connect(filter);
      filter.connect(g);
      g.connect(chGain);
      noise.start(time);
      noise.stop(time + dur + 0.01);
    } else if (type === 'clap') {
      const bufSize = Math.floor(sampleRate * 0.18);
      const buf = offlineCtx.createBuffer(1, bufSize, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = buf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, time);
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.9, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      noise.connect(filter);
      filter.connect(g);
      g.connect(chGain);
      noise.start(time);
      noise.stop(time + 0.19);
    } else {
      // Pitched synths (saw, pluck, bass, pad, rhodes)
      const freq = midiToFreq(midi);
      const osc = offlineCtx.createOscillator();
      const g = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      if (type === 'bass808') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.3, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);
        g.gain.setValueAtTime(0.9, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.2, duration));
      } else if (type === 'pluck') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.15);
        g.gain.setValueAtTime(0.6, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + Math.min(0.3, duration));
        osc.connect(filter);
        filter.connect(g);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, time);
        g.gain.setValueAtTime(0.4, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.1);
        osc.connect(filter);
        filter.connect(g);
      }

      if (!filter.numberOfOutputs) {
        osc.connect(g);
      }
      g.connect(chGain);
      osc.start(time);
      osc.stop(time + duration + 0.15);
    }
  };

  // Schedule pattern or song
  const patMap = new Map<string, Pattern>();
  patterns.forEach((p) => patMap.set(p.id, p));

  if (mode === 'pattern' && activePattern) {
    for (let step = 0; step < 16; step++) {
      const time = step * stepDuration;
      for (const ch of activePattern.channels) {
        if (ch.muted) continue;
        if (ch.steps && ch.steps[step]) {
          const defaultMidi = ch.type.startsWith('bass') ? 36 : 60;
          scheduleNote(ch.type, defaultMidi, time, stepDuration * 1.5, 0.85, ch.volume, ch.pan);
        }
        if (ch.notes) {
          for (const n of ch.notes) {
            if (n.step === step) {
              scheduleNote(ch.type, n.midi, time, n.duration * stepDuration, n.velocity, ch.volume, ch.pan);
            }
          }
        }
      }
    }
  } else {
    // Song arrangement
    for (let bar = 1; bar <= barsToRender; bar++) {
      for (const clip of clips) {
        if (bar >= clip.startBar && bar < clip.startBar + clip.durationBars) {
          const pattern = patMap.get(clip.patternId);
          if (!pattern) continue;
          const barStartStep = (bar - 1) * 16;
          for (let stepInBar = 0; stepInBar < 16; stepInBar++) {
            const currentStep = barStartStep + stepInBar;
            const time = currentStep * stepDuration;

            for (const ch of pattern.channels) {
              if (ch.muted) continue;
              if (ch.steps && ch.steps[stepInBar]) {
                const defaultMidi = ch.type.startsWith('bass') ? 36 : 60;
                scheduleNote(ch.type, defaultMidi, time, stepDuration * 1.5, 0.85, ch.volume, ch.pan);
              }
              if (ch.notes) {
                for (const n of ch.notes) {
                  if (n.step === stepInBar) {
                    scheduleNote(ch.type, n.midi, time, n.duration * stepDuration, n.velocity, ch.volume, ch.pan);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}

// Convert AudioBuffer to standard WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write 16-bit interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Left channel
    let sampleL = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff, true);
    offset += 2;

    // Right channel
    let sampleR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
