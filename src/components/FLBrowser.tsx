import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Music,
  Disc,
  Sliders,
  Volume2,
  Plus,
  Search,
  Sparkles,
  FileAudio
} from 'lucide-react';
import { InstrumentType, Channel } from '../audio/types';
import { engine } from '../audio/synthEngine';

interface FLBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChannel: (channel: Partial<Channel>) => void;
}

interface SampleItem {
  id: string;
  name: string;
  type: InstrumentType;
  category: string;
  color: string;
  defaultMidi?: number;
  description: string;
}

const SAMPLE_DATABASE: SampleItem[] = [
  // Drums
  { id: 's-k1', name: '808 Kick Heavy', type: 'kick', category: 'Drums', color: '#f97316', description: 'Deep tuned sub kick' },
  { id: 's-k2', name: 'Punch Kick Live', type: 'kick', category: 'Drums', color: '#ea580c', description: 'Snappy transient attack' },
  { id: 's-sn1', name: 'Trap Snare Crisp', type: 'snare', category: 'Drums', color: '#06b6d4', description: 'Bright resonant snare' },
  { id: 's-cl1', name: 'Studio Clap Tight', type: 'clap', category: 'Drums', color: '#ec4899', description: 'Multi-layered acoustic clap' },
  { id: 's-hh1', name: 'Hat Closed Clean', type: 'hihat_closed', category: 'Drums', color: '#eab308', description: 'Fast 16th rolling hat' },
  { id: 's-hh2', name: 'Hat Open Sizzle', type: 'hihat_open', category: 'Drums', color: '#facc15', description: 'Shimmering open cymbal' },
  { id: 's-pc1', name: 'Afro Percussion Tom', type: 'perc', category: 'Drums', color: '#14b8a6', defaultMidi: 62, description: 'Warm organic drum tone' },
  { id: 's-cr1', name: 'Crash Splash FX', type: 'crash', category: 'Drums', color: '#f43f5e', description: 'Stereo crash wash' },

  // Bass
  { id: 's-b1', name: '808 Glide Sub', type: 'bass808', category: 'Bass', color: '#84cc16', defaultMidi: 36, description: 'Deep low-end rumble' },
  { id: 's-b2', name: 'Acid 303 Bass', type: 'acid', category: 'Bass', color: '#10b981', defaultMidi: 38, description: 'Resonant squelch bass' },

  // Synths & Melodic
  { id: 's-syn1', name: 'Fruity Pluck', type: 'pluck', category: 'Synths', color: '#a855f7', defaultMidi: 60, description: 'Crisp percussive synth pluck' },
  { id: 's-syn2', name: 'Sawtooth Super Lead', type: 'lead_saw', category: 'Synths', color: '#d946ef', defaultMidi: 64, description: 'Wide stereo trance/trap lead' },
  { id: 's-syn3', name: 'Warm Atmosphere Pad', type: 'pad', category: 'Synths', color: '#6366f1', defaultMidi: 60, description: 'Dreamy textured ambient pad' },
  { id: 's-syn4', name: 'Vintage Rhodes Piano', type: 'rhodes', category: 'Synths', color: '#3b82f6', defaultMidi: 60, description: 'FM soulful electric piano' },
];

export const FLBrowser: React.FC<FLBrowserProps> = ({ isOpen, onClose, onAddChannel }) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Drums: true,
    Bass: true,
    Synths: true,
  });

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handlePreviewSample = (sample: SampleItem) => {
    engine.triggerSound(
      sample.type,
      sample.defaultMidi || (sample.type.startsWith('bass') ? 36 : 60),
      undefined,
      0.35,
      0.9,
      1,
      0.8,
      0
    );
  };

  const handleAddSampleToRack = (sample: SampleItem) => {
    onAddChannel({
      name: sample.name,
      type: sample.type,
      color: sample.color,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      steps: new Array(16).fill(false),
      notes: [],
    });
  };

  const filteredSamples = SAMPLE_DATABASE.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ['Drums', 'Bass', 'Synths'];

  return (
    <aside className="w-64 h-full bg-[#161a22] border-r border-[#27303d] flex flex-col shrink-0 text-slate-300 text-xs shadow-xl select-none">
      {/* Browser Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#14181f] border-b border-[#27303d]">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-orange-400" />
          <span className="font-bold uppercase tracking-wider text-slate-200">
            Browser
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm font-bold px-1"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-[#27303d]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search samples & instruments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1 bg-[#101319] border border-[#2b3543] rounded text-slate-200 text-xs focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Categories & Sample List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {categories.map((cat) => {
          const catSamples = filteredSamples.filter((s) => s.category === cat);
          if (catSamples.length === 0) return null;
          const isExpanded = expandedCategories[cat] !== false;

          return (
            <div key={cat} className="space-y-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-2 py-1 rounded bg-[#1c222c] hover:bg-[#222a36] text-slate-300 font-semibold text-[11px] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{cat}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">({catSamples.length})</span>
              </button>

              {/* Sample Items in Category */}
              {isExpanded && (
                <div className="pl-3 space-y-0.5">
                  {catSamples.map((sample) => (
                    <div
                      key={sample.id}
                      className="group flex items-center justify-between px-2 py-1 rounded hover:bg-[#202733] border border-transparent hover:border-[#2f3949] transition-all cursor-pointer"
                      onClick={() => handlePreviewSample(sample)}
                      title="Click to preview sound. Click + to add to Channel Rack."
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sample.color }}
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-[11px] text-slate-200 group-hover:text-white truncate">
                            {sample.name}
                          </span>
                          <span className="text-[9px] text-slate-500 truncate">
                            {sample.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSampleToRack(sample);
                          }}
                          className="p-1 rounded bg-[#2e3848] hover:bg-orange-500 hover:text-white text-slate-300 transition-colors"
                          title="Add to Channel Rack"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Hint */}
      <div className="p-2 border-t border-[#27303d] bg-[#12151b] text-[10px] text-slate-500 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
        <span>Click any sound to audition in real-time</span>
      </div>
    </aside>
  );
};
