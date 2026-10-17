import React, { useState } from 'react';
import {
  Music,
  Edit2,
  Eraser,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  ChevronDown,
  Grid
} from 'lucide-react';
import { Channel, Note } from '../audio/types';
import { engine, NOTE_NAMES, midiToFreq, midiToPitch } from '../audio/synthEngine';

interface PianoRollProps {
  channel: Channel;
  channels: Channel[];
  onSelectChannel: (channelId: string) => void;
  onUpdateChannelNotes: (notes: Note[]) => void;
  currentStep: number;
  isPlaying: boolean;
  onClose: () => void;
}

// 24 keys: from C3 (MIDI 48) to B4 (MIDI 71) or C2 (36) to B5 (83)
// Let's provide 3 octaves: C3 (48) to B5 (83) = 36 semitones
const START_MIDI = 48; // C3
const END_MIDI = 76;   // E5 (29 notes)

export const PianoRoll: React.FC<PianoRollProps> = ({
  channel,
  channels,
  onSelectChannel,
  onUpdateChannelNotes,
  currentStep,
  isPlaying,
  onClose,
}) => {
  const [activeTool, setActiveTool] = useState<'draw' | 'erase'>('draw');
  const [selectedDuration, setSelectedDuration] = useState<number>(2); // 2 steps = 1/8 note
  const [scaleHighlight, setScaleHighlight] = useState<'all' | 'minor' | 'major'>('minor');

  // Pre-generate note rows from highest pitch to lowest pitch (standard piano roll)
  const rows: { midi: number; pitch: string; isBlack: boolean; inScale: boolean }[] = [];
  for (let m = END_MIDI; m >= START_MIDI; m--) {
    const pitch = midiToPitch(m);
    const isBlack = pitch.includes('#');
    const noteClass = m % 12;
    // C minor: C(0), D(2), Eb(3), F(5), G(7), Ab(8), Bb(10)
    const isMinor = [0, 2, 3, 5, 7, 8, 10].includes(noteClass);
    // C major: C(0), D(2), E(4), F(5), G(7), A(9), B(11)
    const isMajor = [0, 2, 4, 5, 7, 9, 11].includes(noteClass);
    const inScale = scaleHighlight === 'all' || (scaleHighlight === 'minor' ? isMinor : isMajor);

    rows.push({ midi: m, pitch, isBlack, inScale });
  }

  const stepsCount = 16;

  // Handle click on piano key on the left to preview sound
  const handleKeyAudition = (midi: number) => {
    engine.triggerSound(
      channel.type,
      midi,
      undefined,
      0.4,
      0.85,
      channel.mixerTrack,
      channel.volume,
      channel.pan
    );
  };

  // Handle cell click on grid
  const handleCellClick = (midi: number, step: number) => {
    const notes = channel.notes || [];
    const existingIndex = notes.findIndex(
      (n) => n.midi === midi && step >= n.step && step < n.step + n.duration
    );

    if (activeTool === 'erase') {
      if (existingIndex !== -1) {
        const nextNotes = notes.filter((_, idx) => idx !== existingIndex);
        onUpdateChannelNotes(nextNotes);
      }
      return;
    }

    // Draw tool
    if (existingIndex !== -1) {
      // Toggle off
      const nextNotes = notes.filter((_, idx) => idx !== existingIndex);
      onUpdateChannelNotes(nextNotes);
    } else {
      // Add note
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pitch: midiToPitch(midi),
        midi,
        step,
        duration: Math.min(selectedDuration, stepsCount - step),
        velocity: 0.85,
      };
      onUpdateChannelNotes([...notes, newNote]);

      // Sound preview
      engine.triggerSound(
        channel.type,
        midi,
        undefined,
        0.3,
        0.85,
        channel.mixerTrack,
        channel.volume,
        channel.pan
      );
    }
  };

  // Octave shift
  const handleShiftOctave = (delta: number) => {
    const notes = (channel.notes || []).map((n) => ({
      ...n,
      midi: Math.max(24, Math.min(96, n.midi + delta * 12)),
      pitch: midiToPitch(Math.max(24, Math.min(96, n.midi + delta * 12))),
    }));
    onUpdateChannelNotes(notes);
  };

  // Clear all notes
  const handleClear = () => {
    onUpdateChannelNotes([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2028] border border-[#2e3745] rounded-md shadow-2xl overflow-hidden">
      {/* Piano Roll Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161a21] border-b border-[#2b3341] text-xs">
        {/* Left: Active Channel Dropdown */}
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-orange-400" />
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Piano Roll -
          </span>
          <select
            value={channel.id}
            onChange={(e) => onSelectChannel(e.target.value)}
            className="bg-[#202733] border border-[#2e3949] text-amber-400 font-semibold px-2 py-1 rounded focus:outline-none cursor-pointer"
          >
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name} ({ch.type})
              </option>
            ))}
          </select>
        </div>

        {/* Center: Tools (Draw, Erase, Duration, Scale) */}
        <div className="flex items-center gap-2">
          {/* Tool mode */}
          <div className="flex items-center bg-[#111419] p-0.5 rounded border border-[#2a3341]">
            <button
              onClick={() => setActiveTool('draw')}
              title="Draw / Paint notes"
              className={`p-1.5 rounded ${
                activeTool === 'draw' ? 'bg-[#ff7b1a] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('erase')}
              title="Eraser tool"
              className={`p-1.5 rounded ${
                activeTool === 'erase' ? 'bg-[#ff7b1a] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Note Length */}
          <div className="flex items-center gap-1 bg-[#111419] px-2 py-1 rounded border border-[#2a3341]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">LEN:</span>
            {[1, 2, 4, 8].map((dur) => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedDuration === dur ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dur === 1 ? '1/16' : dur === 2 ? '1/8' : dur === 4 ? '1/4' : '1/2'}
              </button>
            ))}
          </div>

          {/* Scale Highlight */}
          <div className="flex items-center gap-1 bg-[#111419] px-2 py-1 rounded border border-[#2a3341]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">SCALE:</span>
            <button
              onClick={() => setScaleHighlight('minor')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                scaleHighlight === 'minor' ? 'bg-purple-900/80 text-purple-200' : 'text-slate-400'
              }`}
            >
              Minor
            </button>
            <button
              onClick={() => setScaleHighlight('major')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                scaleHighlight === 'major' ? 'bg-purple-900/80 text-purple-200' : 'text-slate-400'
              }`}
            >
              Major
            </button>
            <button
              onClick={() => setScaleHighlight('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                scaleHighlight === 'all' ? 'bg-slate-700 text-slate-200' : 'text-slate-400'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Right: Octave shift & Clear */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#111419] p-0.5 rounded border border-[#2a3341]">
            <button
              onClick={() => handleShiftOctave(1)}
              title="Shift Octave Up"
              className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1"
            >
              <ArrowUp className="w-3 h-3" />
              <span>Oct+</span>
            </button>
            <button
              onClick={() => handleShiftOctave(-1)}
              title="Shift Octave Down"
              className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Oct-</span>
            </button>
          </div>

          <button
            onClick={handleClear}
            title="Clear all notes in Piano Roll"
            className="p-1.5 rounded bg-[#202733] hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-[#2c3646] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Roll Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Piano Keyboard Column */}
        <div className="w-18 shrink-0 bg-[#161a20] border-r border-[#2b3341] overflow-y-auto select-none">
          {rows.map((row) => (
            <button
              key={row.midi}
              onClick={() => handleKeyAudition(row.midi)}
              className={`w-full h-5 flex items-center justify-between px-1.5 border-b text-[10px] font-mono transition-colors ${
                row.isBlack
                  ? 'bg-[#181d24] text-slate-400 border-[#232935] hover:bg-[#252c38]'
                  : 'bg-[#293240] text-slate-200 border-[#323d4d] hover:bg-[#384355]'
              }`}
            >
              <span className={`font-semibold ${row.pitch.startsWith('C') ? 'text-amber-400' : ''}`}>
                {row.pitch}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  row.inScale ? 'bg-purple-500/80' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Note Matrix Grid */}
        <div className="flex-1 overflow-auto bg-[#13171e] relative">
          {/* Beat Markers Top Bar */}
          <div className="sticky top-0 z-20 flex bg-[#161b22] border-b border-[#2b3341] text-[10px] font-mono font-bold text-slate-500">
            {Array.from({ length: stepsCount }).map((_, stepIdx) => (
              <div
                key={stepIdx}
                className={`w-12 h-5 flex items-center justify-center shrink-0 border-r border-[#262f3c] ${
                  stepIdx % 4 === 0 ? 'text-amber-400 bg-[#1a202a]' : ''
                }`}
              >
                {stepIdx % 4 === 0 ? `${stepIdx / 4 + 1}` : `${(stepIdx % 4) + 1}`}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {rows.map((row) => {
            const isRootC = row.pitch.startsWith('C') && !row.pitch.includes('#');

            return (
              <div
                key={row.midi}
                className={`flex h-5 border-b relative ${
                  row.isBlack ? 'bg-[#12151b] border-[#1d232c]' : 'bg-[#181d25] border-[#242b36]'
                } ${isRootC ? 'border-b-amber-500/40' : ''}`}
              >
                {Array.from({ length: stepsCount }).map((_, stepIdx) => {
                  const isBeatStart = stepIdx % 4 === 0;
                  const isCurrentPlayhead = isPlaying && currentStep === stepIdx;

                  return (
                    <div
                      key={stepIdx}
                      onClick={() => handleCellClick(row.midi, stepIdx)}
                      className={`w-12 h-full shrink-0 border-r relative cursor-pointer hover:bg-white/5 transition-colors ${
                        isBeatStart ? 'border-r-[#333e4f]' : 'border-r-[#1e2531]'
                      }`}
                    >
                      {/* Playhead vertical line highlight */}
                      {isCurrentPlayhead && (
                        <div className="absolute inset-0 bg-amber-400/20 pointer-events-none z-10" />
                      )}
                    </div>
                  );
                })}

                {/* Render Notes that match this row's MIDI */}
                {(channel.notes || [])
                  .filter((n) => n.midi === row.midi)
                  .map((note) => {
                    const leftPos = note.step * 48; // 48px per step (w-12)
                    const width = Math.max(46, note.duration * 48 - 2);

                    return (
                      <div
                        key={note.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(note.midi, note.step);
                        }}
                        style={{
                          left: `${leftPos}px`,
                          width: `${width}px`,
                          backgroundColor: channel.color,
                        }}
                        className="absolute top-0.5 bottom-0.5 rounded-[2px] shadow-md border border-white/20 flex items-center justify-between px-1 text-[9px] font-bold text-slate-950 truncate select-none cursor-pointer hover:brightness-110 z-15"
                        title={`${note.pitch} (Step ${note.step + 1}, Dur: ${note.duration} steps)`}
                      >
                        <span className="truncate">{note.pitch}</span>
                        <div className="w-1 h-3 bg-white/40 rounded-full" />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
