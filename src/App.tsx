import React, { useState, useEffect, useCallback } from 'react';
import { FLTopBar } from './components/FLTopBar';
import { ChannelRack } from './components/ChannelRack';
import { PianoRoll } from './components/PianoRoll';
import { Playlist } from './components/Playlist';
import { Mixer } from './components/Mixer';
import { FLBrowser } from './components/FLBrowser';
import { VirtualKeyboard } from './components/VirtualKeyboard';

import {
  ActiveWindow,
  PlaybackMode,
  Pattern,
  PlaylistClip,
  MixerTrack,
  Channel,
  Note,
} from './audio/types';
import {
  createDefaultChannels,
  createDefaultPatterns,
  createDefaultClips,
  createDefaultMixerTracks,
} from './audio/defaultProjects';
import { scheduler } from './audio/audioScheduler';
import { engine } from './audio/synthEngine';
import { exportSongToWav } from './audio/exportWav';

export default function App() {
  const [bpm, setBpm] = useState<number>(130);
  const [swing, setSwing] = useState<number>(0.15);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mode, setMode] = useState<PlaybackMode>('pattern');
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>('rack');
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);

  // Playback position state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);

  // Project state
  const [patterns, setPatterns] = useState<Pattern[]>(createDefaultPatterns);
  const [activePatternId, setActivePatternId] = useState<string>('pat-1');
  const [clips, setClips] = useState<PlaylistClip[]>(createDefaultClips);
  const [mixerTracks, setMixerTracks] = useState<MixerTrack[]>(createDefaultMixerTracks);
  const [selectedMixerTrackId, setSelectedMixerTrackId] = useState<number>(1);
  const [activePianoRollChannelId, setActivePianoRollChannelId] = useState<string>('ch-lead');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const activePattern = patterns.find((p) => p.id === activePatternId) || patterns[0];

  // Sync scheduler with latest project data
  useEffect(() => {
    scheduler.setBpm(bpm);
    scheduler.setSwing(swing);
    scheduler.setMode(mode);
    scheduler.updateProjectData(activePattern, patterns, clips, 16);
  }, [bpm, swing, mode, activePattern, patterns, clips]);

  // Sync mixer nodes
  useEffect(() => {
    mixerTracks.forEach((t) => engine.updateMixerTrack(t));
  }, [mixerTracks]);

  // Subscribe to audio scheduler ticks & play state
  useEffect(() => {
    const unsubStep = scheduler.subscribeStep((step, bar) => {
      setCurrentStep(step);
      setCurrentBar(bar);
    });

    const unsubPlay = scheduler.subscribePlayState((playing) => {
      setIsPlaying(playing);
    });

    return () => {
      unsubStep();
      unsubPlay();
    };
  }, []);

  // Global Keyboard Shortcuts (Space for Play/Stop, F5, F6, F7, F9 for Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        scheduler.togglePlay();
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveWindow('playlist');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveWindow('rack');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveWindow('pianoroll');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setActiveWindow('mixer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePlayToggle = () => {
    scheduler.togglePlay();
  };

  const handleStop = () => {
    scheduler.stop();
  };

  const handleSeek = (bar: number) => {
    scheduler.seekSongStep((bar - 1) * 16);
  };

  // Pattern management
  const handleAddPattern = () => {
    const newId = `pat-${Date.now()}`;
    const newPat: Pattern = {
      id: newId,
      name: `Pattern ${patterns.length + 1}`,
      channels: createDefaultChannels().map((c) => ({
        ...c,
        steps: new Array(16).fill(false),
        notes: [],
      })),
    };
    setPatterns([...patterns, newPat]);
    setActivePatternId(newId);
  };

  const handleUpdateChannels = (channels: Channel[]) => {
    setPatterns((prev) =>
      prev.map((p) => (p.id === activePatternId ? { ...p, channels } : p))
    );
  };

  const handleUpdateNotes = (notes: Note[]) => {
    setPatterns((prev) =>
      prev.map((p) => {
        if (p.id !== activePatternId) return p;
        return {
          ...p,
          channels: p.channels.map((ch) =>
            ch.id === activePianoRollChannelId ? { ...ch, notes } : ch
          ),
        };
      })
    );
  };

  const handleOpenPianoRoll = (channelId: string) => {
    setActivePianoRollChannelId(channelId);
    setActiveWindow('pianoroll');
  };

  const handleOpenMixerTrack = (trackId: number) => {
    setSelectedMixerTrackId(trackId);
    setActiveWindow('mixer');
  };

  const handleUpdateTrack = (track: MixerTrack) => {
    setMixerTracks((prev) => prev.map((t) => (t.id === track.id ? track : t)));
  };

  const handleAddChannelFromBrowser = (partialChannel: Partial<Channel>) => {
    const newCh: Channel = {
      id: `ch-${Date.now()}`,
      name: partialChannel.name || 'New Channel',
      type: partialChannel.type || 'pluck',
      color: partialChannel.color || '#a855f7',
      mixerTrack: Math.min(8, (activePattern.channels.length % 8) + 1),
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      steps: new Array(16).fill(false),
      notes: [],
      ...partialChannel,
    };
    handleUpdateChannels([...activePattern.channels, newCh]);
    setActiveWindow('rack');
  };

  // Preset Beat Loaders
  const handleLoadPreset = (presetKey: string) => {
    scheduler.stop();
    if (presetKey === 'trap') {
      setBpm(140);
      setSwing(0.05);
      const chs = createDefaultChannels();
      const p1: Pattern = { id: 'pat-1', name: 'Trap 808 Heat', channels: chs };
      setPatterns([p1]);
      setActivePatternId('pat-1');
      setClips([
        { id: 'c1', patternId: 'pat-1', trackIndex: 0, startBar: 1, durationBars: 8, color: '#f97316' },
      ]);
    } else if (presetKey === 'amapiano') {
      setBpm(113);
      setSwing(0.25);
      const chs = createDefaultChannels().map((ch) => {
        if (ch.type === 'kick') {
          return { ...ch, steps: [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false] };
        }
        if (ch.type === 'hihat_closed') {
          return { ...ch, steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true] };
        }
        return ch;
      });
      const p1: Pattern = { id: 'pat-1', name: 'Amapiano Groove', channels: chs };
      setPatterns([p1]);
      setActivePatternId('pat-1');
      setClips([
        { id: 'c1', patternId: 'pat-1', trackIndex: 0, startBar: 1, durationBars: 8, color: '#10b981' },
      ]);
    } else if (presetKey === 'synthwave') {
      setBpm(122);
      setSwing(0);
      const chs = createDefaultChannels().map((ch) => {
        if (ch.type === 'kick') {
          return { ...ch, steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false] };
        }
        if (ch.type === 'snare') {
          return { ...ch, steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false] };
        }
        return ch;
      });
      const p1: Pattern = { id: 'pat-1', name: 'Synthwave 80s', channels: chs };
      setPatterns([p1]);
      setActivePatternId('pat-1');
      setClips([
        { id: 'c1', patternId: 'pat-1', trackIndex: 0, startBar: 1, durationBars: 8, color: '#06b6d4' },
      ]);
    } else if (presetKey === 'lofi') {
      setBpm(84);
      setSwing(0.35);
      const chs = createDefaultChannels();
      const p1: Pattern = { id: 'pat-1', name: 'Lo-Fi Chill Hop', channels: chs };
      setPatterns([p1]);
      setActivePatternId('pat-1');
      setClips([
        { id: 'c1', patternId: 'pat-1', trackIndex: 0, startBar: 1, durationBars: 8, color: '#a855f7' },
      ]);
    }
  };

  // Export song to real .WAV file
  const handleExportWav = async () => {
    try {
      setIsExporting(true);
      const wavBlob = await exportSongToWav(bpm, patterns, clips, 16, mode, activePattern);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fruity_daw_track_${bpm}bpm.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export WAV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activeChannelForPianoRoll =
    activePattern.channels.find((c) => c.id === activePianoRollChannelId) ||
    activePattern.channels[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#14181f] text-slate-100 overflow-hidden select-none">
      {/* 1. FL Studio Top Navigation & Transport Bar */}
      <FLTopBar
        bpm={bpm}
        onBpmChange={setBpm}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
        onStop={handleStop}
        mode={mode}
        onModeChange={setMode}
        activeWindow={activeWindow}
        onWindowChange={setActiveWindow}
        isBrowserOpen={isBrowserOpen}
        onToggleBrowser={() => setIsBrowserOpen(!isBrowserOpen)}
        currentStep={currentStep}
        currentBar={currentBar}
        onExportWav={handleExportWav}
        onLoadPreset={handleLoadPreset}
        isExporting={isExporting}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left Collapsible Sample Browser */}
        <FLBrowser
          isOpen={isBrowserOpen}
          onClose={() => setIsBrowserOpen(false)}
          onAddChannel={handleAddChannelFromBrowser}
        />

        {/* Center Workspace Viewport (Channel Rack / Piano Roll / Playlist / Mixer) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {activeWindow === 'rack' && (
            <ChannelRack
              activePattern={activePattern}
              patterns={patterns}
              onSelectPattern={setActivePatternId}
              onAddPattern={handleAddPattern}
              onUpdateChannels={handleUpdateChannels}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onOpenPianoRoll={handleOpenPianoRoll}
              onOpenMixerTrack={handleOpenMixerTrack}
              swing={swing}
              onSwingChange={setSwing}
            />
          )}

          {activeWindow === 'pianoroll' && (
            <PianoRoll
              channel={activeChannelForPianoRoll}
              channels={activePattern.channels}
              onSelectChannel={setActivePianoRollChannelId}
              onUpdateChannelNotes={handleUpdateNotes}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onClose={() => setActiveWindow('rack')}
            />
          )}

          {activeWindow === 'playlist' && (
            <Playlist
              patterns={patterns}
              clips={clips}
              onUpdateClips={setClips}
              currentBar={currentBar}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onSeek={handleSeek}
            />
          )}

          {activeWindow === 'mixer' && (
            <Mixer
              tracks={mixerTracks}
              onUpdateTrack={handleUpdateTrack}
              selectedTrackId={selectedMixerTrackId}
              onSelectTrack={setSelectedMixerTrackId}
              isPlaying={isPlaying}
            />
          )}
        </main>
      </div>

      {/* 3. Bottom QWERTY Keyboard to MIDI Controller */}
      <VirtualKeyboard activeChannel={activeChannelForPianoRoll} />
    </div>
  );
}
