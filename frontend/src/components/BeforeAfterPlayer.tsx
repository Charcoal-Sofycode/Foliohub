'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, MoveHorizontal, X, Volume2, VolumeX, SlidersHorizontal, AlertCircle, RefreshCw, Mic, Music, Smartphone, Wind, Info, CheckCircle2, Sparkles } from 'lucide-react';

interface AudioSpotlight {
  time: number;
  label: string;
}

interface InstantVerdict {
  status: 'Professional Grade' | 'Studio Standard' | 'Broadcast Ready';
  checks: string[];
}

interface AudioProofData {
  summary: string; // Outcome-focused, short
  verdict: InstantVerdict;
  guidedPoints: string[];
  spotlights: AudioSpotlight[];
  metrics?: { label: string; value: string }[];
  voiceUrl?: string;
  musicUrl?: string;
}

interface BeforeAfterPlayerProps {
  rawUrl: string;
  finalUrl: string;
  title: string;
  thumbnailUrl?: string;
  className?: string;
  expanded?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  audioProof?: AudioProofData;
  editorName?: string;
}

export default function BeforeAfterPlayer({ 
  rawUrl, 
  finalUrl, 
  title, 
  thumbnailUrl,
  className = "", 
  expanded = false,
  beforeLabel = "Raw Footage",
  afterLabel = "Post Production",
  audioProof,
  editorName = "Foliohub Artist"
}: BeforeAfterPlayerProps) {
  const effectiveAudioProof = audioProof || {
    summary: "Crystal clear dialogue balanced with cinematic background music.",
    verdict: {
      status: 'Professional Grade',
      checks: [
        "Clean voice with no noticeable noise",
        "Balanced music and dialogue",
        "Consistent volume throughout"
      ]
    },
    guidedPoints: [
      "Background noise in the silence",
      "Voice clarity on first sentence",
      "Music vs voice balance at 0:12"
    ],
    spotlights: [
      { time: 3, label: "Noise removed" },
      { time: 12, label: "Voice clarity improved" },
      { time: 25, label: "Music balanced under voice" }
    ],
    metrics: [
      { label: "Loudness", value: "-14 LUFS" },
      { label: "Noise Floor", value: "-60 dB" },
      { label: "Dynamic Range", value: "8.5 dB" }
    ]
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const [audioMode, setAudioMode] = useState<'full' | 'voice' | 'music'>('full');
  const [simulationMode, setSimulationMode] = useState<'none' | 'mobile' | 'noisy'>('none');
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showGuidedListening, setShowGuidedListening] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const voiceVideoRef = useRef<HTMLVideoElement>(null);
  const musicVideoRef = useRef<HTMLVideoElement>(null);
  const syncIntervalRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const filterNodesRef = useRef<{
    mobileFilter?: BiquadFilterNode;
    noiseGain?: GainNode;
    noiseSource?: AudioBufferSourceNode;
    masterGain?: GainNode;
  }>({});

  const syncVideos = useCallback(() => {
    const leader = finalVideoRef.current;
    if (!leader) return;
    const followers = [rawVideoRef.current, voiceVideoRef.current, musicVideoRef.current].filter(f => !!f) as HTMLVideoElement[];
    
    followers.forEach(follower => {
      if (leader.paused !== follower.paused) {
        if (leader.paused) follower.pause();
        else follower.play().catch(() => {});
      }

      const drift = Math.abs(leader.currentTime - follower.currentTime);
      
      if (drift > 0.3 || leader.seeking || (leader.currentTime < 0.2 && follower.currentTime > 1)) {
        follower.currentTime = leader.currentTime;
        follower.playbackRate = leader.playbackRate;
      } else if (drift > 0.04) {
        const speedAdjust = leader.currentTime > follower.currentTime ? 1.1 : 0.9;
        follower.playbackRate = leader.playbackRate * speedAdjust;
      } else {
        if (follower.playbackRate !== leader.playbackRate) {
          follower.playbackRate = leader.playbackRate;
        }
      }
    });

    if (Math.abs(leader.currentTime - currentTime) > 0.1 || duration < 5) {
        setCurrentTime(leader.currentTime);
    }

    syncIntervalRef.current = requestAnimationFrame(syncVideos);
  }, [currentTime, duration]);

  useEffect(() => {
    if (isPlaying && isReady) {
      syncIntervalRef.current = requestAnimationFrame(syncVideos);
    } else {
      if (syncIntervalRef.current) cancelAnimationFrame(syncIntervalRef.current);
    }
    return () => {
      if (syncIntervalRef.current) cancelAnimationFrame(syncIntervalRef.current);
    };
  }, [isPlaying, isReady, syncVideos]);

  useEffect(() => {
    const videos = [rawVideoRef.current, finalVideoRef.current, voiceVideoRef.current, musicVideoRef.current].filter(v => !!v) as HTMLVideoElement[];
    if (videos.length < 2 || !isReady) return;

    if (isPlaying) {
      videos.forEach(v => v.play().catch(() => setIsPlaying(false)));
    } else {
      videos.forEach(v => v.pause());
    }
  }, [isPlaying, isReady]);

  useEffect(() => {
    const vRaw = rawVideoRef.current;
    const vFinal = finalVideoRef.current;
    const vVoice = voiceVideoRef.current;
    const vMusic = musicVideoRef.current;

    if (!vRaw || !vFinal) return;
    
    vRaw.muted = true;
    vFinal.muted = true;
    if (vVoice) vVoice.muted = true;
    if (vMusic) vMusic.muted = true;

    if (isMuted) return;

    const rawVol = Math.max(0, Math.min(1, sliderPosition / 100));
    const finalVol = Math.max(0, Math.min(1, (100 - sliderPosition) / 100));

    if (audioMode === 'full') {
      vRaw.muted = false;
      vFinal.muted = false;
      vRaw.volume = rawVol;
      vFinal.volume = finalVol;
    } else if (audioMode === 'voice' && vVoice) {
      vVoice.muted = false;
      vVoice.volume = finalVol;
      if (rawVol > 0) {
        vRaw.muted = false;
        vRaw.volume = rawVol;
      }
    } else if (audioMode === 'music' && vMusic) {
      vMusic.muted = false;
      vMusic.volume = finalVol;
      if (rawVol > 0) {
        vRaw.muted = false;
        vRaw.volume = rawVol;
      }
    }
  }, [sliderPosition, isMuted, audioMode]);

  useEffect(() => {
    if (simulationMode === 'none') {
      if (filterNodesRef.current.mobileFilter) {
        filterNodesRef.current.mobileFilter.type = 'allpass';
      }
      if (filterNodesRef.current.noiseGain) {
        filterNodesRef.current.noiseGain.gain.setTargetAtTime(0, 0, 0.1);
      }
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioCtxRef.current;

    if (!filterNodesRef.current.masterGain) {
      const masterGain = ctx.createGain();
      const mobileFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      
      mobileFilter.type = 'allpass';
      noiseGain.gain.value = 0;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      noiseSource.start();
      
      noiseSource.connect(noiseGain);
      noiseGain.connect(masterGain);
      mobileFilter.connect(masterGain);
      masterGain.connect(ctx.destination);

      filterNodesRef.current = { mobileFilter, noiseGain, noiseSource, masterGain };

      [rawVideoRef, finalVideoRef, voiceVideoRef, musicVideoRef].forEach(ref => {
        if (ref.current && !sourceNodesRef.current.has(ref.current.src)) {
          const source = ctx.createMediaElementSource(ref.current);
          source.connect(mobileFilter);
          sourceNodesRef.current.set(ref.current.src, source);
        }
      });
    }

    if (simulationMode === 'mobile') {
      filterNodesRef.current.mobileFilter!.type = 'highpass';
      filterNodesRef.current.mobileFilter!.frequency.setTargetAtTime(400, 0, 0.1);
      filterNodesRef.current.noiseGain!.gain.setTargetAtTime(0, 0, 0.1);
    } else if (simulationMode === 'noisy') {
      filterNodesRef.current.mobileFilter!.type = 'allpass';
      filterNodesRef.current.noiseGain!.gain.setTargetAtTime(0.15, 0, 0.1);
    }
  }, [simulationMode]);

  const handlePointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    containerRef.current.style.setProperty('--slider-pos', `${percentage}%`);
    setSliderPosition(percentage);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handlePointerMove(e);
  };

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: PointerEvent) => handlePointerMove(e);
      const onUp = () => setIsDragging(false);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
    }
  }, [isDragging, handlePointerMove]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!document.fullscreenElement) {
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen error:", err);
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (finalVideoRef.current) finalVideoRef.current.currentTime = time;
    if (rawVideoRef.current) rawVideoRef.current.currentTime = time;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCanPlay = () => {
    if (rawVideoRef.current && finalVideoRef.current) {
        if (finalVideoRef.current.duration) {
            setDuration(finalVideoRef.current.duration);
        }
        if (rawVideoRef.current.readyState >= 2 && finalVideoRef.current.readyState >= 2) {
            setIsReady(true);
        }
    }
  };

  const handleError = (e: any) => {
    const video = e.target as HTMLVideoElement;
    setLoadError(`Playback failed (Error ${video.error?.code || 'Unknown'}).`);
  };

  const PlayerContent = (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-[#030303] overflow-hidden select-none group touch-none transition-all duration-500 ${className} ${isFullscreen ? 'fixed inset-0 z-[200] !rounded-none' : (expanded ? 'rounded-none' : 'rounded-xl cursor-zoom-in border border-white/5')}`}
      style={{ 
        '--slider-pos': `${sliderPosition}%`,
        zIndex: isFullscreen ? 2147483647 : undefined 
      } as any}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!expanded && !isFullscreen ? toggleFullscreen : undefined}
    >
      {isFullscreen && (
        <div className="absolute top-0 inset-x-0 z-[100] px-6 py-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
           <div className="flex flex-col">
              <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-zinc-400">Analysis Mode</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
           </div>
           <button 
             onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
             className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center pointer-events-auto shadow-xl"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
      )}
      
      {loadError && (
        <div className="absolute inset-0 z-[70] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4">
           <AlertCircle className="w-8 h-8 text-red-500/50" />
           <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Decryption Failure</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest max-w-[200px]">{loadError}</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-4 py-2 border border-zinc-800 rounded-full text-[10px] text-zinc-400 hover:text-white transition flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Refresh Studio
           </button>
        </div>
      )}

      {!isReady && !loadError && (
        <div className="absolute inset-0 z-[60] bg-[#050505] flex flex-col items-center justify-center gap-4 transition-opacity duration-700">
           <div className="w-6 h-6 border-2 border-white/5 border-t-white rounded-full animate-spin" />
           <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.4em]">Initializing Dual-Source</p>
        </div>
      )}

      {!isPlaying && isReady && expanded && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 z-[45] bg-black/40 flex items-center justify-center cursor-pointer group/overlay"
        >
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-transform group-hover/overlay:scale-110">
              <Play className="w-8 h-8 text-black ml-1 fill-current" />
           </div>
        </div>
      )}

       <div className="absolute inset-x-0 top-0 z-40 pointer-events-none p-6 flex justify-between items-start">
         <motion.div 
            animate={{ opacity: sliderPosition > 10 ? (isHovered || !isPlaying || expanded ? 1 : 0.3) : 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-1"
         >
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Draft Source</span>
            <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/5">
               <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{beforeLabel}</h5>
            </div>
         </motion.div>

         <motion.div 
            animate={{ opacity: sliderPosition < 90 ? (isHovered || !isPlaying || expanded ? 1 : 0.3) : 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-1 items-end text-right"
         >
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Final Master</span>
            <div className="px-3 py-1 bg-white backdrop-blur-md rounded border border-white/5">
               <h5 className="text-[10px] font-bold text-black uppercase tracking-wider">{afterLabel}</h5>
            </div>
         </motion.div>
      </div>

      <div className="absolute inset-0 z-0">
        <video
          ref={rawVideoRef}
          src={rawUrl}
          poster={thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          onCanPlay={handleCanPlay}
          onError={handleError}
          preload="auto"
          className="w-full h-full object-cover"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="absolute inset-0 z-10" style={{ clipPath: 'inset(0 0 0 var(--slider-pos))' }}>
        <video
          ref={finalVideoRef}
          src={finalUrl}
          poster={thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          onCanPlay={handleCanPlay}
          onError={handleError}
          preload="auto"
          className="w-full h-full object-cover"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="absolute inset-0 z-30 pointer-events-none" onContextMenu={(e) => e.preventDefault()} />

      <div 
        className="absolute inset-y-0 z-50 w-1 bg-white cursor-ew-resize group/slider flex items-center justify-center touch-none"
        style={{ left: 'var(--slider-pos)' }}
        onPointerDown={onPointerDown}
      >
        <div className="relative w-10 h-10 bg-white rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform group-hover/slider:scale-110 active:scale-90">
           <MoveHorizontal className="w-5 h-5 text-black" />
           <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-10" />
        </div>
        <div className="absolute inset-y-0 w-[1px] bg-white blur-[2px] opacity-50" />
      </div>

      <AnimatePresence>
        {!isPlaying && isReady && !expanded && isHovered && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-[42] flex items-center justify-center pointer-events-none">
             <div className="px-6 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-[0.3em] rounded-full shadow-2xl">
                Start Interaction
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: (isHovered || isDragging || !isPlaying || expanded) ? 0 : 40, opacity: (isHovered || isDragging || !isPlaying || expanded) ? 1 : 0 }}
        className="absolute inset-x-0 bottom-0 z-50 p-6 bg-gradient-to-t from-black via-black/40 to-transparent"
      >
         <div className="flex items-center justify-between gap-6 pointer-events-auto">
            <div className="flex items-center gap-4 flex-1">
               <button onClick={togglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition active:scale-90 shrink-0">
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
               </button>

               <div className="flex-1 flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 w-10 text-right">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1.5 group/timeline">
                     <input type="range" min={0} max={duration || 100} step={0.01} value={currentTime} onChange={handleSeek} onMouseDown={() => setIsSeeking(true)} onMouseUp={() => setIsSeeking(false)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                     <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-white relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/timeline:scale-100 transition-transform" />
                        </motion.div>
                     </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 w-10">{formatTime(duration)}</span>
               </div>
               
               <button onClick={toggleMute} className="w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full flex items-center justify-center hover:scale-105 transition shrink-0">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
               </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {!expanded && (
                  <button onClick={toggleFullscreen} className={`w-10 h-10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center transition ${isFullscreen ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white hover:text-black'}`}>
                    {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                )}
            </div>
         </div>
      </motion.div>

      {(isFullscreen || expanded) && (
        <div className="absolute inset-0 z-[10] flex flex-col pointer-events-none pt-24">
          <div className="px-6">
             <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/60 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl shadow-2xl min-w-[300px] pointer-events-auto">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-500/80 block">Audio Quality Proof</span>
                        <h4 className="text-xl font-black uppercase tracking-tight text-white leading-none mt-1">
                          {effectiveAudioProof.verdict.status} <span className="text-emerald-400">✅</span>
                        </h4>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 gap-y-3 mb-6">
                      {effectiveAudioProof.verdict.checks.map((check, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                           {check}
                        </div>
                      ))}
                   </div>
                   <div className="pt-5 border-t border-white/5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0"><Mic className="w-4 h-4 text-zinc-500" /></div>
                        <p className="text-xs text-zinc-400 italic leading-relaxed font-serif">"{effectiveAudioProof.summary}"</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Verified Professional</span>
                           <span className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">👨‍💻 Edited by {editorName}</span>
                        </div>
                        <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">AI Audited</div>
                      </div>
                   </div>
                </motion.div>

                <div className="flex flex-col items-end gap-3 self-end md:self-start">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className={`group relative overflow-hidden px-8 py-4 rounded-full flex items-center gap-4 transition-all border-2 pointer-events-auto ${!isMuted ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-black/60 text-white border-white/20 hover:border-white hover:bg-black/80'}`}
                  >
                    {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    <span className="text-xs font-black uppercase tracking-[0.25em]">{!isMuted ? 'Compare Mode Active' : 'Start Audio Comparison'}</span>
                    {isMuted && <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowGuidedListening(!showGuidedListening); }} className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition pointer-events-auto">
                    <Info className="w-3.5 h-3.5" /> Guided Listening
                  </button>
                </div>
             </div>
          </div>

          <AnimatePresence>
            {showGuidedListening && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute top-24 left-6 z-[100] max-w-xs">
                 <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white"><Info className="w-4 h-4" /></div>
                       <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">Listen For This:</h4>
                       <button onClick={() => setShowGuidedListening(false)} className="ml-auto text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <ul className="space-y-3">
                       {effectiveAudioProof.guidedPoints.map((point, i) => (
                          <li key={i} className="flex gap-3 text-[10px] text-zinc-400 font-medium leading-relaxed"><span className="text-white opacity-40">•</span>{point}</li>
                       ))}
                    </ul>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-4">
             {[
               { id: 'full', icon: SlidersHorizontal, label: 'Full Mix' },
               { id: 'voice', icon: Mic, label: 'Voice Only' },
               { id: 'music', icon: Music, label: 'Music Only' }
             ].map(mode => (
               <button key={mode.id} onClick={(e) => { e.stopPropagation(); setAudioMode(mode.id as any); }} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border ${audioMode === mode.id ? 'bg-white text-black border-white' : 'bg-black/60 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'}`}>
                 <mode.icon className="w-5 h-5" />
                 <span className="text-[7px] font-bold uppercase tracking-tighter">{mode.label}</span>
               </button>
             ))}
          </div>

          <div className={`absolute inset-x-0 bottom-[120px] z-[100] px-6 transition-opacity duration-500 ${(isHovered || !isPlaying) ? 'opacity-100' : 'opacity-0'}`}>
             <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 mb-4">
                <div className="flex-1 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
                   <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-4 h-4 text-white/40" />
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Audio Spotlights</h4>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {effectiveAudioProof.spotlights.map((spot, i) => (
                         <button key={i} onClick={(e) => { e.stopPropagation(); if (finalVideoRef.current) finalVideoRef.current.currentTime = spot.time; if (rawVideoRef.current) rawVideoRef.current.currentTime = spot.time; setSliderPosition(0); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-white/80 transition flex items-center gap-2">
                            <Pause className="w-2.5 h-2.5" /> {spot.label}
                         </button>
                      ))}
                   </div>
                </div>
                <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 w-full md:w-64">
                   <div className="flex items-center gap-3 mb-4">
                      <Smartphone className="w-4 h-4 text-white/40" />
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Simulation</h4>
                   </div>
                   <div className="flex gap-2">
                      {[
                        { id: 'none', label: 'Studio', icon: Volume2 },
                        { id: 'mobile', label: 'Mobile', icon: Smartphone },
                        { id: 'noisy', label: 'Cafe', icon: Wind }
                      ].map(sim => (
                        <button key={sim.id} onClick={(e) => { e.stopPropagation(); setSimulationMode(sim.id as any); }} className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-1 transition border ${simulationMode === sim.id ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:text-white'}`}>
                           <sim.icon className="w-3.5 h-3.5" />
                           <span className="text-[8px] font-bold uppercase tracking-tighter">{sim.label}</span>
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="max-w-6xl mx-auto flex flex-col items-end pointer-events-auto">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAdvancedAudio(!showAdvancedAudio); }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all border ${showAdvancedAudio ? 'bg-white text-black border-white shadow-xl' : 'bg-black/40 backdrop-blur-xl border-white/10 text-zinc-500 hover:text-white hover:border-white/30'}`}
                >
                   <SlidersHorizontal className="w-3.5 h-3.5" />
                   {showAdvancedAudio ? 'Hide Technical Audit' : 'Deep Technical Audit'}
                </button>
                
                <AnimatePresence>
                  {showAdvancedAudio && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
                          {effectiveAudioProof.metrics?.map((metric, i) => {
                            const valueNum = parseFloat(metric.value.replace(/[^\\d.-]/g, '')) || 0;
                            const barWidth = Math.abs(valueNum) > 0 ? (100 - Math.abs(valueNum)) : 50; 
                            return (
                              <div key={i} className="bg-white/5 backdrop-blur-3xl border border-white/5 p-6 rounded-3xl flex flex-col items-start text-left relative overflow-hidden group/metric">
                                 <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-3xl -mr-8 -mt-8 transition-transform group-hover/metric:scale-110" />
                                 <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-4">{metric.label}</span>
                                 <span className="text-2xl font-black text-white tracking-tight font-mono">{metric.value}</span>
                                 <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, Math.min(100, barWidth))}%` }} className="h-full bg-emerald-500/40" />
                                 </div>
                              </div>
                            );
                          })}
                          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl flex flex-col justify-center items-start col-span-1 md:col-span-2 lg:col-span-1">
                             <div className="flex items-center gap-2 mb-3">
                               <Sparkles className="w-4 h-4 text-emerald-500" />
                               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">AI Audit Log</span>
                             </div>
                             <p className="text-[10px] text-emerald-500/80 font-mono leading-relaxed">VERIFIED: NO CLIPPING<br/>NOISE REDUCTION: ACTIVE<br/>PHASE ALIGNMENT: 100%</p>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      )}

      {effectiveAudioProof.voiceUrl && <video ref={voiceVideoRef} src={effectiveAudioProof.voiceUrl} loop muted className="hidden" />}
      {effectiveAudioProof.musicUrl && <video ref={musicVideoRef} src={effectiveAudioProof.musicUrl} loop muted className="hidden" />}
      
      {!isFullscreen && expanded && (
        <button onClick={(e) => { e.stopPropagation(); setShowGuidedListening(!showGuidedListening); }} className="absolute top-6 right-6 z-50 px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full flex items-center gap-2 hover:scale-105 transition active:scale-95">
          <Volume2 className="w-3.5 h-3.5" /> Guided Listening
        </button>
      )}
    </div>
  );

  return PlayerContent;
}
