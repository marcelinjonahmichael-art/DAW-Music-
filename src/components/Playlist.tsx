import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Scissors
} from 'lucide-react';
import { Pattern, PlaylistClip } from '../audio/types';

interface PlaylistProps {
  patterns: Pattern[];
  clips: PlaylistClip[];
  onUpdateClips: (clips: PlaylistClip[]) => void;
  currentBar: number;
  currentStep: number;
  isPlaying: boolean;
  onSeek: (bar: number) => void;
}

const TOTAL_TRACKS = 6;
const TOTAL_BARS = 24;

export const Playlist: React.FC<PlaylistProps> = ({
  patterns,
  clips,
  onUpdateClips,
  currentBar,
  currentStep,
  isPlaying,
  onSeek,
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    patterns[0]?.id || ''
  );
  const [clipDurationBars, setClipDurationBars] = useState<number>(4);
  const [mutedTracks, setMutedTracks] = useState<boolean[]>(new Array(TOTAL_TRACKS).fill(false));

  const toggleTrackMute = (trackIdx: number) => {
    const next = [...mutedTracks];
    next[trackIdx] = !next[trackIdx];
    setMutedTracks(next);
  };

  // Add or remove clip on cell click
  const handleBarTrackClick = (trackIndex: number, bar: number) => {
    // Check if clicked inside existing clip
    const existingIndex = clips.findIndex(
      (c) => c.trackIndex === trackIndex && bar >= c.startBar && bar < c.startBar + c.durationBars
    );

    if (existingIndex !== -1) {
      // Remove clip
      const nextClips = clips.filter((_, idx) => idx !== existingIndex);
      onUpdateClips(nextClips);
    } else {
      // Add clip
      const pattern = patterns.find((p) => p.id === selectedPatternId) || patterns[0];
      if (!pattern) return;

      const newClip: PlaylistClip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        patternId: pattern.id,
        trackIndex,
        startBar: bar,
        durationBars: Math.min(clipDurationBars, TOTAL_BARS - bar + 1),
        color: pattern.channels[0]?.color || '#f97316',
      };
      onUpdateClips([...clips, newClip]);
    }
  };

  const handleClearPlaylist = () => {
    onUpdateClips([]);
  };

  const handleFillDemoArrangement = () => {
    // Fill full standard song structure (Intro -> Drop -> Verse -> Chorus)
    const newClips: PlaylistClip[] = [
      // Drums Track 0
      { id: 'c1', patternId: patterns[0]?.id || '', trackIndex: 0, startBar: 1, durationBars: 4, color: '#f97316' },
      { id: 'c2', patternId: patterns[0]?.id || '', trackIndex: 0, startBar: 5, durationBars: 4, color: '#f97316' },
      { id: 'c3', patternId: patterns[1]?.id || patterns[0]?.id || '', trackIndex: 0, startBar: 9, durationBars: 4, color: '#06b6d4' },
      { id: 'c4', patternId: patterns[0]?.id || '', trackIndex: 0, startBar: 13, durationBars: 4, color: '#f97316' },
      { id: 'c5', patternId: patterns[1]?.id || patterns[0]?.id || '', trackIndex: 0, startBar: 17, durationBars: 4, color: '#06b6d4' },

      // Melodies Track 1
      { id: 'c6', patternId: patterns[2]?.id || patterns[0]?.id || '', trackIndex: 1, startBar: 1, durationBars: 4, color: '#a855f7' },
      { id: 'c7', patternId: patterns[0]?.id || '', trackIndex: 1, startBar: 5, durationBars: 4, color: '#a855f7' },
      { id: 'c8', patternId: patterns[0]?.id || '', trackIndex: 1, startBar: 9, durationBars: 4, color: '#a855f7' },
      { id: 'c9', patternId: patterns[2]?.id || patterns[0]?.id || '', trackIndex: 1, startBar: 13, durationBars: 4, color: '#a855f7' },
      { id: 'c10', patternId: patterns[0]?.id || '', trackIndex: 1, startBar: 17, durationBars: 4, color: '#a855f7' },
    ];
    onUpdateClips(newClips);
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2028] border border-[#2e3745] rounded-md shadow-2xl overflow-hidden">
      {/* Arranger Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161a21] border-b border-[#2b3341] text-xs">
        {/* Left: Selected Pattern to paint */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Playlist Arranger
          </span>
          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          <div className="flex items-center gap-1 bg-[#12151b] px-2 py-0.5 rounded border border-[#2a3341]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">CLIP TO PAINT:</span>
            <select
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1b2028] text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Block Duration */}
        <div className="flex items-center gap-1 bg-[#111419] px-2 py-1 rounded border border-[#2a3341]">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">LENGTH:</span>
          {[1, 2, 4, 8].map((bars) => (
            <button
              key={bars}
              onClick={() => setClipDurationBars(bars)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                clipDurationBars === bars
                  ? 'bg-slate-700 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {bars} Bars
            </button>
          ))}
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFillDemoArrangement}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202733] hover:bg-[#2b3545] text-slate-300 hover:text-white border border-[#2c3646] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate Structure</span>
          </button>

          <button
            onClick={handleClearPlaylist}
            className="p-1.5 rounded bg-[#202733] hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-[#2c3646] transition-colors"
            title="Clear all playlist clips"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Multi-Track Arranger Timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Left Deck */}
        <div className="w-44 shrink-0 bg-[#151920] border-r border-[#2b3341] select-none">
          {/* Top corner blank */}
          <div className="h-7 border-b border-[#2b3341] px-2 flex items-center text-[10px] font-bold text-slate-500 uppercase">
            Tracks
          </div>

          {Array.from({ length: TOTAL_TRACKS }).map((_, trackIdx) => {
            const isMuted = mutedTracks[trackIdx];
            const trackLabels = [
              'Drums & Rhythm',
              'Bass & 808',
              'Leads & Plucks',
              'Keys & Chords',
              'Pads & Atmos',
              'FX & Risers',
            ];

            return (
              <div
                key={trackIdx}
                className={`h-16 border-b border-[#242c38] px-2 flex items-center justify-between transition-colors ${
                  isMuted ? 'bg-[#101318] opacity-50' : 'bg-[#171b23] hover:bg-[#1c222c]'
                }`}
              >
                <div className="flex flex-col truncate pr-1">
                  <span className="text-[11px] font-bold text-slate-300 truncate">
                    Track {trackIdx + 1}
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">
                    {trackLabels[trackIdx] || 'Audio / Pattern'}
                  </span>
                </div>

                <button
                  onClick={() => toggleTrackMute(trackIdx)}
                  className={`p-1 rounded ${
                    isMuted ? 'text-red-400 bg-red-950/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={isMuted ? 'Unmute Track' : 'Mute Track'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Timeline Grid & Clip Canvas */}
        <div className="flex-1 overflow-auto bg-[#12161d] relative">
          {/* Bar Ruler Header */}
          <div className="sticky top-0 z-20 flex bg-[#161b23] border-b border-[#2b3341] text-[10px] font-mono font-bold text-slate-400">
            {Array.from({ length: TOTAL_BARS }).map((_, barIdx) => {
              const barNum = barIdx + 1;
              const isCurrentBar = currentBar === barNum;

              return (
                <div
                  key={barNum}
                  onClick={() => onSeek(barNum)}
                  className={`w-20 h-7 flex items-center justify-between px-2 shrink-0 border-r border-[#242c38] cursor-pointer hover:bg-white/5 transition-colors ${
                    isCurrentBar ? 'text-amber-400 bg-amber-500/10' : ''
                  }`}
                >
                  <span>Bar {barNum}</span>
                  <span className="text-[9px] text-slate-600">·</span>
                </div>
              );
            })}
          </div>

          {/* Tracks Rows */}
          <div className="relative">
            {Array.from({ length: TOTAL_TRACKS }).map((_, trackIdx) => (
              <div
                key={trackIdx}
                className="flex h-16 border-b border-[#202733] relative bg-[#13171f]"
              >
                {Array.from({ length: TOTAL_BARS }).map((_, barIdx) => {
                  const barNum = barIdx + 1;
                  const isCurrent = isPlaying && currentBar === barNum;

                  return (
                    <div
                      key={barNum}
                      onClick={() => handleBarTrackClick(trackIdx, barNum)}
                      className={`w-20 h-full shrink-0 border-r border-[#1a202a] cursor-pointer hover:bg-white/5 transition-colors relative ${
                        isCurrent ? 'bg-amber-400/5' : ''
                      }`}
                    >
                      {/* Sub-beat dividers */}
                      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/40 pointer-events-none" />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Clips Overlay */}
            {clips.map((clip) => {
              const pattern = patterns.find((p) => p.id === clip.patternId);
              const leftPos = (clip.startBar - 1) * 80; // 80px per bar (w-20)
              const width = clip.durationBars * 80 - 2;
              const topPos = clip.trackIndex * 64 + 4; // 64px per track height
              const isTrackMuted = mutedTracks[clip.trackIndex];

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBarTrackClick(clip.trackIndex, clip.startBar);
                  }}
                  style={{
                    left: `${leftPos}px`,
                    width: `${width}px`,
                    top: `${topPos}px`,
                    height: '56px',
                  }}
                  className={`absolute rounded-[4px] border border-white/20 shadow-md p-1.5 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all select-none z-10 ${
                    isTrackMuted ? 'opacity-30' : ''
                  }`}
                >
                  <div
                    className="absolute inset-0 rounded-[3px] opacity-85"
                    style={{ backgroundColor: clip.color || '#f97316' }}
                  />

                  {/* Clip Header Label */}
                  <div className="relative z-10 flex items-center justify-between text-slate-950 font-bold text-[11px] truncate">
                    <span className="truncate">{pattern?.name || 'Pattern Clip'}</span>
                    <span className="text-[9px] font-mono opacity-75">{clip.durationBars} Bars</span>
                  </div>

                  {/* Simulated Audio Waveform / Pattern Blocks */}
                  <div className="relative z-10 flex items-center gap-0.5 h-3 opacity-60">
                    {Array.from({ length: 16 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-slate-950/70 rounded-full"
                        style={{ height: `${20 + ((idx * 17) % 80)}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Moving Playhead Marker in Song Mode */}
            {isPlaying && (
              <div
                style={{
                  left: `${(currentBar - 1) * 80 + (currentStep / 16) * 80}px`,
                }}
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_#fbbf24] z-30 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -ml-1 -mt-1 shadow" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
