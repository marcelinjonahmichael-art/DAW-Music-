import React, { useState } from 'react';
import {
  Volume2,
  Plus,
  Trash2,
  Music,
  MoreVertical,
  Sliders,
  Sparkles,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Channel, Pattern, InstrumentType } from '../audio/types';
import { engine } from '../audio/synthEngine';

interface ChannelRackProps {
  activePattern: Pattern;
  patterns: Pattern[];
  onSelectPattern: (patternId: string) => void;
  onAddPattern: () => void;
  onUpdateChannels: (channels: Channel[]) => void;
  currentStep: number;
  isPlaying: boolean;
  onOpenPianoRoll: (channelId: string) => void;
  onOpenMixerTrack: (trackId: number) => void;
  swing: number;
  onSwingChange: (val: number) => void;
}

export const ChannelRack: React.FC<ChannelRackProps> = ({
  activePattern,
  patterns,
  onSelectPattern,
  onAddPattern,
  onUpdateChannels,
  currentStep,
  isPlaying,
  onOpenPianoRoll,
  onOpenMixerTrack,
  swing,
  onSwingChange,
}) => {
  const [stepCount, setStepCount] = useState<16 | 32>(16);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeMenuChannelId, setActiveMenuChannelId] = useState<string | null>(null);

  // Toggle step
  const handleToggleStep = (channelIndex: number, stepIndex: number) => {
    const updated = [...activePattern.channels];
    const targetChannel = { ...updated[channelIndex] };
    const steps = [...(targetChannel.steps || new Array(stepCount).fill(false))];
    steps[stepIndex] = !steps[stepIndex];
    targetChannel.steps = steps;
    updated[channelIndex] = targetChannel;
    onUpdateChannels(updated);

    // Audio preview on activating step
    if (steps[stepIndex]) {
      engine.triggerSound(
        targetChannel.type,
        targetChannel.type.startsWith('bass') ? 36 : 60,
        undefined,
        0.2,
        0.8,
        targetChannel.mixerTrack,
        targetChannel.volume,
        targetChannel.pan
      );
    }
  };

  // Toggle mute
  const handleToggleMute = (channelIndex: number) => {
    const updated = [...activePattern.channels];
    updated[channelIndex] = {
      ...updated[channelIndex],
      muted: !updated[channelIndex].muted,
    };
    onUpdateChannels(updated);
  };

  // Solo channel
  const handleSolo = (channelIndex: number) => {
    const isCurrentlySolo = activePattern.channels[channelIndex].solo;
    const updated = activePattern.channels.map((ch, idx) => ({
      ...ch,
      solo: idx === channelIndex ? !isCurrentlySolo : false,
      muted: !isCurrentlySolo && idx !== channelIndex,
    }));
    onUpdateChannels(updated);
  };

  // Volume change
  const handleVolumeChange = (channelIndex: number, vol: number) => {
    const updated = [...activePattern.channels];
    updated[channelIndex] = {
      ...updated[channelIndex],
      volume: vol,
    };
    onUpdateChannels(updated);
  };

  // Pan change
  const handlePanChange = (channelIndex: number, pan: number) => {
    const updated = [...activePattern.channels];
    updated[channelIndex] = {
      ...updated[channelIndex],
      pan,
    };
    onUpdateChannels(updated);
  };

  // Mixer track assignment
  const handleMixerTrackChange = (channelIndex: number, track: number) => {
    const clamped = Math.max(1, Math.min(8, track));
    const updated = [...activePattern.channels];
    updated[channelIndex] = {
      ...updated[channelIndex],
      mixerTrack: clamped,
    };
    onUpdateChannels(updated);
  };

  // Fill steps helper
  const handleFillSteps = (channelIndex: number, interval: number) => {
    const updated = [...activePattern.channels];
    const targetChannel = { ...updated[channelIndex] };
    const steps = new Array(stepCount).fill(false);
    for (let i = 0; i < stepCount; i += interval) {
      steps[i] = true;
    }
    targetChannel.steps = steps;
    updated[channelIndex] = targetChannel;
    onUpdateChannels(updated);
    setActiveMenuChannelId(null);
  };

  // Clear steps
  const handleClearSteps = (channelIndex: number) => {
    const updated = [...activePattern.channels];
    const targetChannel = { ...updated[channelIndex] };
    targetChannel.steps = new Array(stepCount).fill(false);
    updated[channelIndex] = targetChannel;
    onUpdateChannels(updated);
    setActiveMenuChannelId(null);
  };

  // Delete channel
  const handleDeleteChannel = (channelIndex: number) => {
    if (activePattern.channels.length <= 1) return;
    const updated = activePattern.channels.filter((_, idx) => idx !== channelIndex);
    onUpdateChannels(updated);
    setActiveMenuChannelId(null);
  };

  // Add new channel
  const handleAddChannel = (type: InstrumentType, name: string, color: string) => {
    const newChan: Channel = {
      id: `ch-${Date.now()}`,
      name,
      type,
      color,
      mixerTrack: Math.min(8, (activePattern.channels.length % 8) + 1),
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      steps: new Array(stepCount).fill(false),
      notes: [],
    };
    onUpdateChannels([...activePattern.channels, newChan]);
    setShowAddMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e232b] border border-[#2e3745] rounded-md shadow-2xl overflow-hidden">
      {/* Channel Rack Header Window Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#171b22] border-b border-[#2a323f]">
        {/* Left: Pattern Switcher */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
            Channel Rack
          </span>
          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          {/* Pattern dropdown */}
          <div className="flex items-center gap-1 bg-[#12151b] px-2 py-0.5 rounded border border-[#2a3341]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">PAT:</span>
            <select
              value={activePattern.id}
              onChange={(e) => onSelectPattern(e.target.value)}
              className="bg-transparent text-amber-400 font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1b2028] text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onAddPattern}
            title="Create New Pattern"
            className="p-1 rounded bg-[#202733] hover:bg-[#2c3646] text-slate-300 hover:text-white border border-[#2c3646] transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Step length selector & Swing */}
        <div className="flex items-center gap-3 text-xs">
          {/* Swing Knob / Slider */}
          <div className="flex items-center gap-1.5 bg-[#12151b] px-2 py-1 rounded border border-[#2a3341]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">SWING</span>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={swing}
              onChange={(e) => onSwingChange(parseFloat(e.target.value))}
              className="w-14 h-1 accent-amber-500 bg-slate-700 rounded cursor-pointer"
              title={`Groove Swing: ${Math.round(swing * 100)}%`}
            />
            <span className="text-[10px] font-mono text-slate-300 w-6 text-right tabular-nums">
              {Math.round(swing * 100)}%
            </span>
          </div>

          {/* Steps mode: 16 vs 32 */}
          <div className="flex items-center bg-[#12151b] p-0.5 rounded border border-[#2a3341]">
            <button
              onClick={() => setStepCount(16)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                stepCount === 16 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              16 STEPS
            </button>
            <button
              onClick={() => setStepCount(32)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                stepCount === 32 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              32 STEPS
            </button>
          </div>
        </div>
      </div>

      {/* Sequencer Grid Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Step Numbers Top Ruler */}
        <div className="flex items-center pl-72 pr-2 pb-1 text-[10px] font-mono text-slate-500">
          {Array.from({ length: stepCount }).map((_, stepIdx) => (
            <div
              key={stepIdx}
              className={`flex-1 text-center font-bold ${
                stepIdx % 4 === 0 ? 'text-amber-400' : 'text-slate-600'
              }`}
            >
              {stepIdx % 4 === 0 ? `${stepIdx / 4 + 1}` : '·'}
            </div>
          ))}
        </div>

        {/* Channel Rows */}
        {activePattern.channels.map((channel, chIdx) => {
          const hasNotes = channel.notes && channel.notes.length > 0;

          return (
            <div
              key={channel.id}
              className={`flex items-center gap-1.5 p-1 rounded bg-[#161a20] border ${
                channel.muted ? 'border-transparent opacity-50' : 'border-[#262e3b]'
              } hover:border-[#384355] transition-all`}
            >
              {/* Channel Controls Left Deck (Mute, Solo, Vol, Pan, Mixer #, Name) */}
              <div className="flex items-center gap-1.5 w-68 shrink-0">
                {/* Mute Button (FL Studio Green LED) */}
                <button
                  onClick={() => handleToggleMute(chIdx)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleSolo(chIdx);
                  }}
                  title="Click to Mute / Right-Click to Solo"
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    channel.muted
                      ? 'bg-slate-700 border border-slate-600'
                      : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${channel.muted ? 'bg-slate-900' : 'bg-white'}`} />
                </button>

                {/* Pan Slider/Knob */}
                <div className="flex items-center" title={`Pan: ${Math.round(channel.pan * 100)}`}>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={channel.pan}
                    onChange={(e) => handlePanChange(chIdx, parseFloat(e.target.value))}
                    className="w-8 h-1 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
                  />
                </div>

                {/* Vol Slider */}
                <div className="flex items-center" title={`Volume: ${Math.round(channel.volume * 100)}%`}>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={channel.volume}
                    onChange={(e) => handleVolumeChange(chIdx, parseFloat(e.target.value))}
                    className="w-10 h-1 accent-orange-500 bg-slate-700 rounded cursor-pointer"
                  />
                </div>

                {/* Mixer Target Track Box */}
                <div
                  onClick={() => onOpenMixerTrack(channel.mixerTrack)}
                  title={`Routed to Mixer Insert ${channel.mixerTrack}. Click to view mixer.`}
                  className="w-5 h-5 bg-[#12151b] border border-[#2b3442] hover:border-amber-500/50 rounded flex items-center justify-center text-[10px] font-mono font-bold text-amber-400 cursor-pointer tabular-nums"
                >
                  {channel.mixerTrack}
                </div>

                {/* Channel Name Button (Click to audition sound & open Piano Roll) */}
                <div className="relative flex-1 flex items-center">
                  <button
                    onClick={() => {
                      engine.triggerSound(
                        channel.type,
                        channel.type.startsWith('bass') ? 36 : 60,
                        undefined,
                        0.3,
                        0.9,
                        channel.mixerTrack,
                        channel.volume,
                        channel.pan
                      );
                    }}
                    onDoubleClick={() => onOpenPianoRoll(channel.id)}
                    className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-[#202733] hover:bg-[#283242] border border-[#2f3949] rounded text-left transition-colors group overflow-hidden"
                    title="Click to preview sound. Double click to open Piano Roll [F7]."
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: channel.color }}
                    />
                    <span className="text-[11px] font-medium text-slate-200 truncate group-hover:text-white">
                      {channel.name}
                    </span>
                    {hasNotes && (
                      <span className="text-[9px] px-1 py-0.2 bg-purple-900/60 text-purple-300 rounded font-mono ml-auto">
                        ROLL
                      </span>
                    )}
                  </button>

                  {/* Channel Menu Toggle */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuChannelId(activeMenuChannelId === channel.id ? null : channel.id)
                      }
                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {/* Context menu for channel */}
                    {activeMenuChannelId === channel.id && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-[#1b2028] border border-[#343e50] rounded-lg shadow-2xl p-1 z-40 text-xs text-slate-200">
                        <button
                          onClick={() => {
                            onOpenPianoRoll(channel.id);
                            setActiveMenuChannelId(null);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2b3340] flex items-center gap-2"
                        >
                          <Music className="w-3.5 h-3.5 text-purple-400" />
                          <span>Edit in Piano Roll</span>
                        </button>
                        <button
                          onClick={() => handleFillSteps(chIdx, 2)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340]"
                        >
                          Fill each 2 steps
                        </button>
                        <button
                          onClick={() => handleFillSteps(chIdx, 4)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340]"
                        >
                          Fill each 4 steps
                        </button>
                        <button
                          onClick={() => handleFillSteps(chIdx, 8)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340]"
                        >
                          Fill each 8 steps
                        </button>
                        <button
                          onClick={() => handleClearSteps(chIdx)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-amber-300"
                        >
                          Clear all steps
                        </button>
                        <div className="h-px bg-slate-700 my-1" />
                        <button
                          onClick={() => handleDeleteChannel(chIdx)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-red-950/60 text-red-400 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Channel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 16 or 32 Step Sequencer Buttons Grid */}
              <div className="flex-1 flex items-center gap-1 h-7">
                {Array.from({ length: stepCount }).map((_, stepIdx) => {
                  const isActive = channel.steps && channel.steps[stepIdx];
                  const isPlayhead = isPlaying && currentStep === stepIdx;
                  // Grouping into 4-beat blocks: 0-3 light, 4-7 dark, 8-11 light, 12-15 dark
                  const beatBlock = Math.floor(stepIdx / 4);
                  const isAlternateBlock = beatBlock % 2 === 1;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleToggleStep(chIdx, stepIdx)}
                      className={`flex-1 h-full rounded-[3px] border transition-all relative ${
                        isActive
                          ? 'border-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                          : isAlternateBlock
                          ? 'bg-[#262c37] border-[#303845] hover:bg-[#323947]'
                          : 'bg-[#3b4352] border-[#444e5f] hover:bg-[#465063]'
                      } ${
                        isPlayhead ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#111419]' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? channel.color : undefined,
                      }}
                      title={`Step ${stepIdx + 1}`}
                    >
                      {/* Active indicator dot */}
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Channel Button */}
        <div className="relative pt-2">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#202733] hover:bg-[#2b3545] border border-[#2d3748] text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span>Add Instrument / Drum Channel</span>
          </button>

          {showAddMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-60 bg-[#1b2028] border border-[#343e50] rounded-lg shadow-2xl p-1.5 z-40 text-xs">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-[#2b3340]">
                Select Instrument to Add
              </div>

              <div className="py-1">
                <span className="text-[10px] text-orange-400 font-semibold px-2 uppercase">Drums & 808</span>
                <button
                  onClick={() => handleAddChannel('kick', '808 Kick 2', '#f97316')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  808 Kick
                </button>
                <button
                  onClick={() => handleAddChannel('snare', 'Punch Snare', '#06b6d4')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Punch Snare
                </button>
                <button
                  onClick={() => handleAddChannel('hihat_open', 'Open Hi-Hat', '#eab308')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Open Hi-Hat
                </button>
                <button
                  onClick={() => handleAddChannel('perc', 'Afro Perc Tom', '#14b8a6')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Afro Percussion
                </button>
                <button
                  onClick={() => handleAddChannel('crash', 'Crash Cymbal', '#f43f5e')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Crash Cymbal
                </button>
                <button
                  onClick={() => handleAddChannel('bass808', 'Heavy 808 Sub', '#84cc16')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Heavy 808 Sub-Bass
                </button>
              </div>

              <div className="py-1 border-t border-[#2b3340]">
                <span className="text-[10px] text-purple-400 font-semibold px-2 uppercase">Synthesizers & Keys</span>
                <button
                  onClick={() => handleAddChannel('lead_saw', 'Sawtooth Lead', '#ec4899')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Sawtooth Lead Synth
                </button>
                <button
                  onClick={() => handleAddChannel('pluck', 'Fruity Pluck 2', '#a855f7')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Pluck Synth
                </button>
                <button
                  onClick={() => handleAddChannel('pad', 'Warm Atmosphere Pad', '#6366f1')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Warm Pad
                </button>
                <button
                  onClick={() => handleAddChannel('rhodes', 'Vintage Rhodes Keys', '#3b82f6')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Rhodes Keys
                </button>
                <button
                  onClick={() => handleAddChannel('acid', 'Acid 303 Bass', '#10b981')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#2b3340] text-slate-200"
                >
                  Acid 303 Bass
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
