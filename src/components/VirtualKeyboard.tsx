import React, { useEffect, useState } from 'react';
import { Keyboard, ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import { Channel } from '../audio/types';
import { engine, NOTE_NAMES, midiToPitch } from '../audio/synthEngine';

interface VirtualKeyboardProps {
  activeChannel: Channel;
}

const KEY_MAPPINGS: { key: string; semitoneOffset: number; isBlack: boolean; noteName: string }[] = [
  { key: 'a', semitoneOffset: 0, isBlack: false, noteName: 'C' },
  { key: 'w', semitoneOffset: 1, isBlack: true, noteName: 'C#' },
  { key: 's', semitoneOffset: 2, isBlack: false, noteName: 'D' },
  { key: 'e', semitoneOffset: 3, isBlack: true, noteName: 'D#' },
  { key: 'd', semitoneOffset: 4, isBlack: false, noteName: 'E' },
  { key: 'f', semitoneOffset: 5, isBlack: false, noteName: 'F' },
  { key: 't', semitoneOffset: 6, isBlack: true, noteName: 'F#' },
  { key: 'g', semitoneOffset: 7, isBlack: false, noteName: 'G' },
  { key: 'y', semitoneOffset: 8, isBlack: true, noteName: 'G#' },
  { key: 'h', semitoneOffset: 9, isBlack: false, noteName: 'A' },
  { key: 'u', semitoneOffset: 10, isBlack: true, noteName: 'A#' },
  { key: 'j', semitoneOffset: 11, isBlack: false, noteName: 'B' },
  { key: 'k', semitoneOffset: 12, isBlack: false, noteName: 'C' },
  { key: 'o', semitoneOffset: 13, isBlack: true, noteName: 'C#' },
  { key: 'l', semitoneOffset: 14, isBlack: false, noteName: 'D' },
  { key: 'p', semitoneOffset: 15, isBlack: true, noteName: 'D#' },
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeChannel }) => {
  const [octave, setOctave] = useState(4); // C4 base
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const baseMidi = (octave + 1) * 12; // C4 = 60

  const playNote = (semitone: number) => {
    const midi = baseMidi + semitone;
    engine.triggerSound(
      activeChannel.type,
      midi,
      undefined,
      0.35,
      0.85,
      activeChannel.mixerTrack,
      activeChannel.volume,
      activeChannel.pan
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Spacebar handled in top bar
      if (e.key === ' ') return;

      // Octave controls: Z / X
      if (e.key.toLowerCase() === 'z') {
        setOctave((prev) => Math.max(1, prev - 1));
        return;
      }
      if (e.key.toLowerCase() === 'x') {
        setOctave((prev) => Math.min(7, prev + 1));
        return;
      }

      const match = KEY_MAPPINGS.find((k) => k.key === e.key.toLowerCase());
      if (match && !activeKeys.has(match.key)) {
        setActiveKeys((prev) => new Set(prev).add(match.key));
        playNote(match.semitoneOffset);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const match = KEY_MAPPINGS.find((k) => k.key === e.key.toLowerCase());
      if (match) {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(match.key);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octave, activeChannel, activeKeys]);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#14181f] border-t border-[#27303d] text-xs shrink-0 select-none">
      {/* Left: Active instrument indicator & Octave transposer */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Keyboard className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-slate-200">PC Keyboard Mode:</span>
          <span className="text-amber-400 font-bold">{activeChannel.name}</span>
        </div>

        {/* Octave Selector (Z / X) */}
        <div className="flex items-center gap-1 bg-[#101319] px-2 py-0.5 rounded border border-[#2b3543]">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">OCTAVE:</span>
          <button
            onClick={() => setOctave((prev) => Math.max(1, prev - 1))}
            className="px-1 text-slate-300 hover:text-white font-bold"
            title="Octave down (Press 'Z')"
          >
            -
          </button>
          <span className="font-mono text-emerald-400 font-bold w-4 text-center tabular-nums">
            C{octave}
          </span>
          <button
            onClick={() => setOctave((prev) => Math.min(7, prev + 1))}
            className="px-1 text-slate-300 hover:text-white font-bold"
            title="Octave up (Press 'X')"
          >
            +
          </button>
          <span className="text-[9px] text-slate-500 font-mono pl-1">[Z / X]</span>
        </div>
      </div>

      {/* Visual Keyboard Keys Row */}
      <div className="flex items-center gap-0.5 overflow-x-auto py-0.5">
        {KEY_MAPPINGS.map((item) => {
          const isPressed = activeKeys.has(item.key);

          return (
            <button
              key={item.key}
              onMouseDown={() => playNote(item.semitoneOffset)}
              className={`h-9 px-2 rounded-sm border flex flex-col items-center justify-between text-[9px] font-mono font-bold transition-all ${
                item.isBlack
                  ? isPressed
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#1b2028] text-slate-400 border-[#2b3341] hover:bg-[#252c38]'
                  : isPressed
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-[#2a3342] text-slate-200 border-[#384558] hover:bg-[#344052]'
              }`}
              title={`Play ${item.noteName} (Key: ${item.key.toUpperCase()})`}
            >
              <span>{item.noteName}</span>
              <span className="text-[8px] opacity-60 uppercase">{item.key}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Quick shortcut guide */}
      <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500">
        <span className="px-1.5 py-0.5 bg-[#1b2028] rounded border border-[#2b3341] text-slate-400 font-mono">
          Space
        </span>
        <span>Play/Stop</span>
      </div>
    </div>
  );
};
