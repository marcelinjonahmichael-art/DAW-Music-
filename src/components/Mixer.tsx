import React, { useEffect, useRef, useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { MixerTrack } from '../audio/types';
import { engine } from '../audio/synthEngine';

interface MixerProps {
  tracks: MixerTrack[];
  onUpdateTrack: (track: MixerTrack) => void;
  selectedTrackId: number;
  onSelectTrack: (trackId: number) => void;
  isPlaying: boolean;
}

export const Mixer: React.FC<MixerProps> = ({
  tracks,
  onUpdateTrack,
  selectedTrackId,
  onSelectTrack,
  isPlaying,
}) => {
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];
  const [meterLevels, setMeterLevels] = useState<number[]>(new Array(tracks.length).fill(0));

  // Poll analyser nodes for live VU meter animations
  useEffect(() => {
    let animId: number;

    const updateMeters = () => {
      const nextLevels = tracks.map((track) => {
        const analyser =
          track.id === 0 ? engine.getMasterAnalyser() : engine.getTrackAnalyser(track.id);
        if (!analyser || track.muted) return 0;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        // Calculate peak amplitude
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = Math.abs(dataArray[i] - 128) / 128;
          if (val > maxVal) maxVal = val;
        }
        return Math.min(1.0, maxVal * (track.volume || 1.0) * 1.6);
      });

      setMeterLevels(nextLevels);
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [tracks]);

  // Volume fader change
  const handleVolumeChange = (track: MixerTrack, vol: number) => {
    const updated = { ...track, volume: vol };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  // Pan change
  const handlePanChange = (track: MixerTrack, pan: number) => {
    const updated = { ...track, pan };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  // Mute toggle
  const handleToggleMute = (track: MixerTrack) => {
    const updated = { ...track, muted: !track.muted };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  // Solo toggle
  const handleToggleSolo = (track: MixerTrack) => {
    const isSolo = !track.solo;
    tracks.forEach((t) => {
      const upd = {
        ...t,
        solo: t.id === track.id ? isSolo : false,
        muted: isSolo ? t.id !== track.id : false,
      };
      onUpdateTrack(upd);
      engine.updateMixerTrack(upd);
    });
  };

  // FX updates
  const handleEqChange = (key: 'low' | 'mid' | 'high', val: number) => {
    const updated: MixerTrack = {
      ...selectedTrack,
      eq: { ...selectedTrack.eq, [key]: val },
    };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  const handleDelayChange = (field: string, val: unknown) => {
    const updated: MixerTrack = {
      ...selectedTrack,
      delay: { ...selectedTrack.delay, [field]: val },
    };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  const handleReverbChange = (field: string, val: unknown) => {
    const updated: MixerTrack = {
      ...selectedTrack,
      reverb: { ...selectedTrack.reverb, [field]: val },
    };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  const handleDistortionChange = (field: string, val: unknown) => {
    const updated: MixerTrack = {
      ...selectedTrack,
      distortion: { ...selectedTrack.distortion, [field]: val },
    };
    onUpdateTrack(updated);
    engine.updateMixerTrack(updated);
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2028] border border-[#2e3745] rounded-md shadow-2xl overflow-hidden">
      {/* Mixer Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161a21] border-b border-[#2b3341] text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-orange-400" />
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Fruity Mixer
          </span>
          <span className="text-[11px] text-slate-500">
            · Master + 8 Insert Tracks & FX Rack
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">SELECTED:</span>
          <span className="font-bold text-amber-400 bg-[#12151b] px-2 py-0.5 rounded border border-[#2b3341]">
            {selectedTrack.id === 0 ? 'Master' : `Insert ${selectedTrack.id}: ${selectedTrack.name}`}
          </span>
        </div>
      </div>

      {/* Main Mixer Body: Fader Channels Left + Effects Rack Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Faders Area */}
        <div className="flex-1 flex overflow-x-auto p-2 gap-1.5 bg-[#141820]">
          {tracks.map((track) => {
            const isMaster = track.id === 0;
            const isSelected = track.id === selectedTrackId;
            const meterLevel = meterLevels[track.id] || 0;

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`w-18 shrink-0 flex flex-col items-center justify-between p-1.5 rounded border cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'bg-[#212836] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : isMaster
                    ? 'bg-[#181d26] border-[#384355]'
                    : 'bg-[#181d26] border-[#252c38] hover:border-[#384355]'
                }`}
              >
                {/* Track ID & Name */}
                <div className="w-full text-center">
                  <div
                    className={`text-[10px] font-mono font-bold ${
                      isMaster ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {isMaster ? 'MST' : `IN ${track.id}`}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-200 truncate mt-0.5" title={track.name}>
                    {track.name}
                  </div>
                </div>

                {/* Pan Pot Knob */}
                <div className="flex flex-col items-center gap-0.5 my-1">
                  <span className="text-[8px] text-slate-500 font-mono">PAN</span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={track.pan}
                    onChange={(e) => handlePanChange(track, parseFloat(e.target.value))}
                    className="w-10 h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
                    title={`Pan: ${Math.round(track.pan * 100)}`}
                  />
                </div>

                {/* Vertical Fader & Real-Time Animated VU Meter */}
                <div className="flex items-center gap-1.5 h-44 my-1">
                  {/* Vertical Range Slider */}
                  <div className="relative h-full flex items-center justify-center">
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.02"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track, parseFloat(e.target.value))}
                      className="h-38 w-1.5 accent-amber-500 bg-slate-700 rounded cursor-pointer -rotate-90 origin-center"
                      title={`Volume: ${Math.round(track.volume * 100)}%`}
                    />
                  </div>

                  {/* FL Studio Animated LED VU Meter (Green -> Orange -> Red Peak) */}
                  <div className="w-2.5 h-38 bg-[#0d1015] rounded border border-[#2b3341] overflow-hidden flex flex-col-reverse p-0.5 relative">
                    <div
                      className="w-full rounded-sm transition-all duration-75"
                      style={{
                        height: `${meterLevel * 100}%`,
                        backgroundColor:
                          meterLevel > 0.85
                            ? '#ef4444' // Red clip
                            : meterLevel > 0.6
                            ? '#f59e0b' // Amber warm
                            : '#10b981', // Green nominal
                        boxShadow: meterLevel > 0.1 ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
                      }}
                    />
                  </div>
                </div>

                {/* dB Readout */}
                <div className="text-[9px] font-mono text-slate-400 tabular-nums">
                  {track.volume === 0 ? '-inf' : `${Math.round((track.volume - 1) * 12)} dB`}
                </div>

                {/* Mute and Solo Buttons */}
                <div className="flex items-center gap-1 w-full mt-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute(track);
                    }}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-colors ${
                      track.muted
                        ? 'bg-red-900/60 text-red-300'
                        : 'bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSolo(track);
                    }}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-colors ${
                      track.solo
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-[#222935] text-slate-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Track Effects Rack Inspector (Right Dock) */}
        <div className="w-68 shrink-0 bg-[#161a21] border-l border-[#2b3341] p-3 flex flex-col gap-3 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2b3341] pb-2">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-200">
              FX Rack: {selectedTrack.name}
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
          </div>

          {/* Slot 1: 3-Band Parametric EQ */}
          <div className="bg-[#12151b] p-2.5 rounded border border-[#262f3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>3-Band EQ</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Biquad</span>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Low (250Hz)</span>
                <span className="font-mono text-cyan-400 tabular-nums">{selectedTrack.eq.low} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={selectedTrack.eq.low}
                onChange={(e) => handleEqChange('low', parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Mid (1.5kHz)</span>
                <span className="font-mono text-cyan-400 tabular-nums">{selectedTrack.eq.mid} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={selectedTrack.eq.mid}
                onChange={(e) => handleEqChange('mid', parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">High (6.5kHz)</span>
                <span className="font-mono text-cyan-400 tabular-nums">{selectedTrack.eq.high} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={selectedTrack.eq.high}
                onChange={(e) => handleEqChange('high', parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Slot 2: Stereo Delay */}
          <div className="bg-[#12151b] p-2.5 rounded border border-[#262f3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Fruity Delay</span>
              <button
                onClick={() => handleDelayChange('enabled', !selectedTrack.delay.enabled)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedTrack.delay.enabled
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {selectedTrack.delay.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {selectedTrack.delay.enabled && (
              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Time</span>
                  <span className="font-mono text-amber-400 tabular-nums">{selectedTrack.delay.time}s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={selectedTrack.delay.time}
                  onChange={(e) => handleDelayChange('time', parseFloat(e.target.value))}
                  className="w-full h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Feedback</span>
                  <span className="font-mono text-amber-400 tabular-nums">
                    {Math.round(selectedTrack.delay.feedback * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.05"
                  value={selectedTrack.delay.feedback}
                  onChange={(e) => handleDelayChange('feedback', parseFloat(e.target.value))}
                  className="w-full h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Wet Mix</span>
                  <span className="font-mono text-amber-400 tabular-nums">
                    {Math.round(selectedTrack.delay.mix * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedTrack.delay.mix}
                  onChange={(e) => handleDelayChange('mix', parseFloat(e.target.value))}
                  className="w-full h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Slot 3: Reverb */}
          <div className="bg-[#12151b] p-2.5 rounded border border-[#262f3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Fruity Reverb</span>
              <button
                onClick={() => handleReverbChange('enabled', !selectedTrack.reverb.enabled)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedTrack.reverb.enabled
                    ? 'bg-purple-500 text-slate-950'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {selectedTrack.reverb.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {selectedTrack.reverb.enabled && (
              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Decay Tail</span>
                  <span className="font-mono text-purple-400 tabular-nums">{selectedTrack.reverb.decay}s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.2"
                  value={selectedTrack.reverb.decay}
                  onChange={(e) => handleReverbChange('decay', parseFloat(e.target.value))}
                  className="w-full h-1 accent-purple-500 bg-slate-700 rounded cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Wet Mix</span>
                  <span className="font-mono text-purple-400 tabular-nums">
                    {Math.round(selectedTrack.reverb.mix * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedTrack.reverb.mix}
                  onChange={(e) => handleReverbChange('mix', parseFloat(e.target.value))}
                  className="w-full h-1 accent-purple-500 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Slot 4: WaveShaper Distortion */}
          <div className="bg-[#12151b] p-2.5 rounded border border-[#262f3c] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">WaveShaper Drive</span>
              <button
                onClick={() =>
                  handleDistortionChange('enabled', !selectedTrack.distortion.enabled)
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedTrack.distortion.enabled
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {selectedTrack.distortion.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {selectedTrack.distortion.enabled && (
              <div className="space-y-1.5 text-[10px] pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Drive Saturation</span>
                  <span className="font-mono text-orange-400 tabular-nums">
                    {Math.round(selectedTrack.distortion.amount * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={selectedTrack.distortion.amount}
                  onChange={(e) => handleDistortionChange('amount', parseFloat(e.target.value))}
                  className="w-full h-1 accent-orange-500 bg-slate-700 rounded cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
