import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  Pause,
  Circle,
  Volume2,
  Grid,
  Music,
  Sliders,
  FolderOpen,
  Download,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
  FileAudio
} from 'lucide-react';
import { engine } from '../audio/synthEngine';
import { scheduler } from '../audio/audioScheduler';
import { ActiveWindow, PlaybackMode } from '../audio/types';

interface FLTopBarProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  mode: PlaybackMode;
  onModeChange: (mode: PlaybackMode) => void;
  activeWindow: ActiveWindow;
  onWindowChange: (w: ActiveWindow) => void;
  isBrowserOpen: boolean;
  onToggleBrowser: () => void;
  currentStep: number;
  currentBar: number;
  onExportWav: () => void;
  onLoadPreset: (presetKey: string) => void;
  isExporting: boolean;
}

export const FLTopBar: React.FC<FLTopBarProps> = ({
  bpm,
  onBpmChange,
  isPlaying,
  onPlayToggle,
  onStop,
  mode,
  onModeChange,
  activeWindow,
  onWindowChange,
  isBrowserOpen,
  onToggleBrowser,
  currentStep,
  currentBar,
  onExportWav,
  onLoadPreset,
  isExporting,
}) => {
  const [metronome, setMetronome] = useState(false);
  const [masterVol, setMasterVol] = useState(0.85);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live oscilloscope / spectrum visualizer in top bar (FL Studio style!)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const analyser = engine.getMasterAnalyser();
      if (!analyser) {
        animId = requestAnimationFrame(render);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#111419';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid lines
      ctx.strokeStyle = '#1e242d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Oscilloscope line (FL green/orange glow)
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPlaying ? '#ff8412' : '#4a5568';
      ctx.shadowBlur = isPlaying ? 6 : 0;
      ctx.shadowColor = '#ff8412';

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const toggleMetronome = () => {
    const next = !metronome;
    setMetronome(next);
    scheduler.setMetronome(next);
  };

  const handleBpmStep = (delta: number) => {
    onBpmChange(Math.max(50, Math.min(240, bpm + delta)));
  };

  const formatBeatPosition = () => {
    const beat = Math.floor(currentStep / 4) + 1;
    const stepInBeat = (currentStep % 4) + 1;
    const barStr = String(currentBar).padStart(3, '0');
    return `${barStr}:${String(beat).padStart(2, '0')}:${String(stepInBeat).padStart(2, '0')}`;
  };

  return (
    <header className="flex items-center justify-between gap-3 px-3 py-2 bg-[#181c22] border-b border-[#2a303c] text-slate-200 text-xs shadow-md shrink-0">
      {/* Zone 1: Brand & Window Shortcuts */}
      <div className="flex items-center gap-3">
        {/* Fruity Studio Logo / Title */}
        <div className="flex items-center gap-2 pr-2 border-r border-[#2b3340]">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-inner font-extrabold text-[13px]">
            FL
          </div>
          <span className="font-bold tracking-tight text-slate-100 text-[13px] whitespace-nowrap">
            Fruity Studio
          </span>
        </div>

        {/* Window View Switchers (F5 Playlist, F6 Rack, F7 Piano Roll, F9 Mixer) */}
        <div className="flex items-center gap-1 bg-[#12151a] p-1 rounded border border-[#2b3340]">
          <button
            onClick={() => onWindowChange('rack')}
            title="Channel Rack [F6]"
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
              activeWindow === 'rack'
                ? 'bg-[#ff7b1a] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#202631]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Channel Rack</span>
          </button>

          <button
            onClick={() => onWindowChange('pianoroll')}
            title="Piano Roll [F7]"
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
              activeWindow === 'pianoroll'
                ? 'bg-[#ff7b1a] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#202631]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Piano Roll</span>
          </button>

          <button
            onClick={() => onWindowChange('playlist')}
            title="Playlist Arrangement [F5]"
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
              activeWindow === 'playlist'
                ? 'bg-[#ff7b1a] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#202631]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Playlist</span>
          </button>

          <button
            onClick={() => onWindowChange('mixer')}
            title="Mixer [F9]"
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition-colors whitespace-nowrap ${
              activeWindow === 'mixer'
                ? 'bg-[#ff7b1a] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#202631]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Mixer</span>
          </button>
        </div>

        {/* Browser Toggle */}
        <button
          onClick={onToggleBrowser}
          title="Toggle Browser / Sample Library [Alt+F8]"
          className={`px-2 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            isBrowserOpen
              ? 'bg-[#2b3340] border-[#445063] text-orange-400'
              : 'border-[#2b3340] text-slate-400 hover:bg-[#202631]'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Browser</span>
        </button>
      </div>

      {/* Zone 2: FL Transport Engine, Pattern/Song Mode, BPM & Counter */}
      <div className="flex items-center gap-3">
        {/* PAT / SONG Mode Switch (Signature FL orange illuminated toggle) */}
        <div className="flex items-center bg-[#111419] p-0.5 rounded border border-[#2b3340]">
          <button
            onClick={() => onModeChange('pattern')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all whitespace-nowrap ${
              mode === 'pattern'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            PAT
          </button>
          <button
            onClick={() => onModeChange('song')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all whitespace-nowrap ${
              mode === 'song'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SONG
          </button>
        </div>

        {/* Transport Buttons: Play, Stop, Record */}
        <div className="flex items-center gap-1 bg-[#111419] p-1 rounded border border-[#2b3340]">
          <button
            onClick={onPlayToggle}
            title={isPlaying ? 'Pause' : 'Play (Space)'}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              isPlaying
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                : 'bg-[#222935] text-emerald-400 hover:bg-[#2a3342]'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={onStop}
            title="Stop & Reset"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#222935] text-slate-300 hover:bg-[#2a3342] hover:text-white transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            title="Metronome"
            onClick={toggleMetronome}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors text-xs font-mono font-bold ${
              metronome
                ? 'bg-orange-500 text-slate-950 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                : 'bg-[#222935] text-slate-400 hover:bg-[#2a3342]'
            }`}
          >
            TIC
          </button>
        </div>

        {/* BPM Counter */}
        <div className="flex items-center gap-1.5 bg-[#111419] px-2.5 py-1 rounded border border-[#2b3340]">
          <div className="flex flex-col text-slate-400 text-[9px] uppercase font-semibold leading-none">
            <span>BPM</span>
          </div>
          <span className="text-amber-400 font-mono font-bold text-sm tabular-nums w-9 text-right">
            {bpm}
          </span>
          <div className="flex flex-col -space-y-0.5">
            <button
              onClick={() => handleBpmStep(1)}
              className="hover:text-amber-400 text-slate-400 p-0.5"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleBpmStep(-1)}
              className="hover:text-amber-400 text-slate-400 p-0.5"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Song Position Display */}
        <div className="bg-[#111419] px-3 py-1 rounded border border-[#2b3340] flex items-center gap-2">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">POS</span>
          <span className="font-mono text-emerald-400 font-bold text-xs tabular-nums tracking-wider">
            {formatBeatPosition()}
          </span>
        </div>

        {/* Master Output Oscilloscope */}
        <div className="hidden lg:flex items-center bg-[#111419] p-0.5 rounded border border-[#2b3340]">
          <canvas
            ref={canvasRef}
            width={120}
            height={26}
            className="rounded"
          />
        </div>
      </div>

      {/* Zone 3: Project Actions, Presets & WAV Export */}
      <div className="flex items-center gap-2">
        {/* Demo Presets Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#202632] hover:bg-[#293242] text-slate-300 hover:text-white border border-[#2b3340] text-xs transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Beats</span>
          </button>

          {showPresetsMenu && (
            <div className="absolute right-0 mt-1 w-52 bg-[#1b2028] border border-[#343e50] rounded-lg shadow-xl p-1 z-50">
              <div className="px-2 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-[#2b3340]">
                Select Demo Project
              </div>
              <button
                onClick={() => {
                  onLoadPreset('trap');
                  setShowPresetsMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2b3340] text-xs flex flex-col text-slate-200"
              >
                <span className="font-medium text-amber-400">Trap Heat 808</span>
                <span className="text-[10px] text-slate-400">140 BPM · Hard 808 & Snare Roll</span>
              </button>
              <button
                onClick={() => {
                  onLoadPreset('amapiano');
                  setShowPresetsMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2b3340] text-xs flex flex-col text-slate-200"
              >
                <span className="font-medium text-emerald-400">Afrobeat / Amapiano</span>
                <span className="text-[10px] text-slate-400">113 BPM · Warm Log Drum & Rhodes</span>
              </button>
              <button
                onClick={() => {
                  onLoadPreset('synthwave');
                  setShowPresetsMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2b3340] text-xs flex flex-col text-slate-200"
              >
                <span className="font-medium text-cyan-400">Synthwave 80s</span>
                <span className="text-[10px] text-slate-400">122 BPM · Retro Saw & Gated Drums</span>
              </button>
              <button
                onClick={() => {
                  onLoadPreset('lofi');
                  setShowPresetsMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2b3340] text-xs flex flex-col text-slate-200"
              >
                <span className="font-medium text-purple-400">Lo-Fi Chill Hop</span>
                <span className="text-[10px] text-slate-400">84 BPM · Relaxed Vinyl Chords</span>
              </button>
            </div>
          )}
        </div>

        {/* Master Volume */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#111419] rounded border border-[#2b3340]">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.05"
            value={masterVol}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setMasterVol(val);
              engine.updateMixerTrack({
                id: 0,
                name: 'Master',
                volume: val,
                pan: 0,
                muted: false,
                solo: false,
                eq: { low: 0, mid: 0, high: 0 },
                delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0 },
                reverb: { enabled: false, decay: 1.5, mix: 0 },
                distortion: { enabled: false, amount: 0 },
              });
            }}
            className="w-16 h-1.5 accent-amber-500 bg-slate-700 rounded cursor-pointer"
            title={`Master Volume: ${Math.round(masterVol * 100)}%`}
          />
        </div>

        {/* Export to WAV Button */}
        <button
          onClick={onExportWav}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs shadow transition-colors whitespace-nowrap disabled:opacity-50"
          title="Export audio directly to high-quality .WAV file"
        >
          {isExporting ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Rendering...</span>
            </>
          ) : (
            <>
              <FileAudio className="w-3.5 h-3.5" />
              <span>Export WAV</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
