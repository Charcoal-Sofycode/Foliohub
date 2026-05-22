'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, MoveHorizontal, X, Volume2, VolumeX, AlertCircle, RefreshCw } from 'lucide-react';

interface BeforeAfterPlayerProps {
  rawUrl: string;
  finalUrl: string;
  title: string;
  thumbnailUrl?: string;
  className?: string;
  expanded?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  editorName?: string;
  subscriptionTier?: 'free' | 'premium';
  hideControls?: boolean;
  initialMuted?: boolean;
  playing?: boolean;
  onVideoClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  qualityBadgeClassName?: string;
  syncOffsetMs?: number;
  audioMode?: 'crossfade' | 'final_only' | 'raw_only';
  timelineMarkers?: Array<{ timestamp: number; label: string; color?: string }>;
}

export default forwardRef(function BeforeAfterPlayer({ 
  rawUrl, 
  finalUrl, 
  title, 
  thumbnailUrl,
  className = "", 
  expanded = false,
  beforeLabel = "Raw Footage",
  afterLabel = "Post Production",
  editorName = "Foliohub Artist",
  subscriptionTier = "free",
  hideControls = false,
  initialMuted = true,
  playing: externalPlaying,
  onVideoClick,
  onContextMenu,
  onPointerDown,
  onPointerUp,
  onTimeUpdate,
  onDurationChange,
  videoRef: externalVideoRef,
  qualityBadgeClassName,
  syncOffsetMs = 0,
  audioMode = 'crossfade',
  timelineMarkers = []
}: BeforeAfterPlayerProps, ref) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [rawReady, setRawReady] = useState(false);
  const [finalReady, setFinalReady] = useState(false);
  const isReady = rawReady && finalReady;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  
  // High-frequency refs to avoid React re-renders
  const sliderPosRef = useRef(50);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const isDraggingRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const internalFinalVideoRef = useRef<HTMLVideoElement>(null);
  const finalVideoRef = externalVideoRef || internalFinalVideoRef;
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const durationDisplayRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // 1. Unified High-Performance Sync Loop
  const updateLoop = useCallback(() => {
    const final = finalVideoRef.current;
    const raw = rawVideoRef.current;
    if (!final || !raw) return;

    const pos = sliderPosRef.current;
    const inCenter = pos >= 40 && pos <= 60;
    const watchingRaw = pos > 60;
    const watchingFinal = pos < 40;

    const offsetSec = syncOffsetMs / 1000;
    const targetRawTime = Math.max(0, Math.min(raw.duration || Infinity, final.currentTime + offsetSec));

    // A. Playback Control & Sync Logic
    if (inCenter) {
      // Both must play and sync
      if (final.paused && isPlaying) final.play().catch(() => {});
      if (raw.paused && isPlaying) raw.play().catch(() => {});
      
      // Sync raw to final with offset
      const drift = targetRawTime - raw.currentTime;
      if (Math.abs(drift) > 0.15) {
        raw.currentTime = targetRawTime;
      } else if (Math.abs(drift) > 0.01) {
        raw.playbackRate = final.playbackRate * (1 + drift * 0.5);
      }
    } else if (watchingRaw) {
      // Only Raw plays, Final pauses
      if (raw.paused && isPlaying) raw.play().catch(() => {});
      if (!final.paused) final.pause();
    } else if (watchingFinal) {
      // Only Final plays, Raw pauses
      if (final.paused && isPlaying) final.play().catch(() => {});
      if (!raw.paused) raw.pause();
    }

    // B. UI Update (Always use the one that is currently playing or dominant)
    const leader = watchingRaw ? raw : final;
    
    // Update time display directly in DOM (High Performance)
    if (timeDisplayRef.current) {
      // If raw is the leader, subtract offset to show the aligned timeline progress
      const displayTime = watchingRaw ? Math.max(0, leader.currentTime - offsetSec) : leader.currentTime;
      const minutes = Math.floor(displayTime / 60);
      const seconds = Math.floor(displayTime % 60);
      timeDisplayRef.current.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (onTimeUpdate) {
      const displayTime = watchingRaw ? Math.max(0, leader.currentTime - offsetSec) : leader.currentTime;
      onTimeUpdate(displayTime);
    }

    // Update progress bar directly in DOM
    if (progressBarRef.current && leader.duration) {
      const displayTime = watchingRaw ? Math.max(0, leader.currentTime - offsetSec) : leader.currentTime;
      const duration = watchingRaw ? Math.max(0.1, leader.duration - offsetSec) : leader.duration;
      const progress = (displayTime / duration) * 100;
      progressBarRef.current.style.width = `${progress}%`;
    }

    // Update volume based on slider directly
    if (!isMuted) {
      if (audioMode === 'final_only') {
        raw.volume = 0;
        raw.muted = true;
        final.volume = 1;
        final.muted = false;
      } else if (audioMode === 'raw_only') {
        raw.volume = 1;
        raw.muted = false;
        final.volume = 0;
        final.muted = true;
      } else {
        // Crossfade
        const rawVol = Math.max(0, Math.min(1, pos / 100));
        const finalVol = Math.max(0, Math.min(1, (100 - pos) / 100));
        raw.volume = rawVol;
        final.volume = finalVol;
        raw.muted = rawVol < 0.01;
        final.muted = finalVol < 0.01;
      }
    } else {
      raw.volume = 0;
      final.volume = 0;
      raw.muted = true;
      final.muted = true;
    }

    // C. Continue Loop if master state is playing
    if (!leader.paused || isPlaying) {
      if ('requestVideoFrameCallback' in leader) {
        (leader as any).requestVideoFrameCallback(updateLoop);
      } else {
        requestAnimationFrame(updateLoop);
      }
    }
  }, [isMuted, isPlaying, syncOffsetMs, audioMode]);

  useEffect(() => {
    const raw = rawVideoRef.current;
    const final = finalVideoRef.current;
    if (raw?.readyState && raw.readyState >= 1) setRawReady(true);
    if (final?.readyState && final.readyState >= 1) setFinalReady(true);
  }, []);

  useEffect(() => {
    const leader = finalVideoRef.current;
    const raw = rawVideoRef.current;
    if (!leader) return;

    const handlePlay = () => {
      setIsPlaying(true);
      updateLoop();
    };
    const handlePause = () => {
      // Only set to false if BOTH are paused
      if (rawVideoRef.current?.paused && finalVideoRef.current?.paused) {
        setIsPlaying(false);
      }
    };

    const handleSeeked = () => {
      if (rawVideoRef.current && finalVideoRef.current) {
        const offsetSec = syncOffsetMs / 1000;
        rawVideoRef.current.currentTime = Math.max(0, Math.min(rawVideoRef.current.duration || Infinity, finalVideoRef.current.currentTime + offsetSec));
      }
    };

    // Buffer Synchronization
    const handleWaiting = () => {
      if (isPlaying) {
        rawVideoRef.current?.pause();
        finalVideoRef.current?.pause();
      }
    };

    const handlePlaying = () => {
      if (isPlaying) {
        const pos = sliderPosRef.current;
        if (pos > 60) {
          rawVideoRef.current?.play().catch(() => {});
        } else if (pos < 40) {
          finalVideoRef.current?.play().catch(() => {});
        } else {
          if ((rawVideoRef.current?.readyState ?? 0) >= 3 && (finalVideoRef.current?.readyState ?? 0) >= 3) {
            rawVideoRef.current?.play().catch(() => {});
            finalVideoRef.current?.play().catch(() => {});
          }
        }
      }
    };

    leader.addEventListener('play', handlePlay);
    leader.addEventListener('pause', handlePause);
    leader.addEventListener('seeked', handleSeeked);
    leader.addEventListener('waiting', handleWaiting);
    leader.addEventListener('playing', handlePlaying);
    
    if (raw) {
      raw.addEventListener('play', handlePlay);
      raw.addEventListener('pause', handlePause);
      raw.addEventListener('waiting', handleWaiting);
      raw.addEventListener('playing', handlePlaying);
    }
    
    // Initial check
    if (!leader.paused || !rawVideoRef.current?.paused) handlePlay();

    return () => {
      leader.removeEventListener('play', handlePlay);
      leader.removeEventListener('pause', handlePause);
      leader.removeEventListener('seeked', handleSeeked);
      leader.removeEventListener('waiting', handleWaiting);
      leader.removeEventListener('playing', handlePlaying);
      if (raw) {
        raw.removeEventListener('play', handlePlay);
        raw.removeEventListener('pause', handlePause);
        raw.removeEventListener('waiting', handleWaiting);
        raw.removeEventListener('playing', handlePlaying);
      }
    };
  }, [updateLoop, finalVideoRef, syncOffsetMs]);

  // External playback control sync
  useEffect(() => {
    if (externalPlaying === undefined) return;
    
    const final = finalVideoRef.current;
    const raw = rawVideoRef.current;
    if (!final || !raw) return;

    if (externalPlaying) {
      const pos = sliderPosRef.current;
      if (pos > 60) raw.play().catch(() => {});
      else final.play().catch(() => {});
    } else {
      final.pause();
      raw.pause();
    }
  }, [externalPlaying, finalVideoRef]);

  // 2. Aspect Ratio Detection
  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement>, type: 'raw' | 'final') => {
    const video = e.target as HTMLVideoElement;
    
    if (type === 'final') {
      const ratio = video.videoWidth / video.videoHeight;
      setAspectRatio(ratio);
      
      if (durationDisplayRef.current) {
        const d = video.duration;
        durationRef.current = d;
        const min = Math.floor(d / 60);
        const sec = Math.floor(d % 60);
        durationDisplayRef.current.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
      }
      if (onDurationChange) onDurationChange(video.duration);
      setFinalReady(true);
    } else {
      setRawReady(true);
    }
  };

  // 3. Ultra-Smooth Slider (Direct DOM)
  const handlePointerMove = (e: PointerEvent | React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    
    sliderPosRef.current = percentage;
    containerRef.current.style.setProperty('--slider-pos', `${percentage}%`);
    containerRef.current.style.setProperty('--slider-pos-val', `${percentage}`);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isDraggingRef.current) handlePointerMove(e);
    };
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      finalVideoRef.current?.play().catch(() => {});
      rawVideoRef.current?.play().catch(() => {});
    } else {
      finalVideoRef.current?.pause();
      rawVideoRef.current?.pause();
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useImperativeHandle(ref, () => ({
    toggleFullscreen
  }));

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const final = finalVideoRef.current;
    const raw = rawVideoRef.current;
    if (final) final.currentTime = time;
    if (raw) {
      const offsetSec = syncOffsetMs / 1000;
      raw.currentTime = Math.max(0, Math.min(raw.duration || Infinity, time + offsetSec));
    }
    if (onTimeUpdate) onTimeUpdate(time);
    
    // Update progress bar immediately for visual feedback
    if (progressBarRef.current && durationRef.current) {
      const progress = (time / durationRef.current) * 100;
      progressBarRef.current.style.width = `${progress}%`;
    }
  };

  const handlePreviewMouseEnter = () => {
    setIsHovered(true);
    isHoveredRef.current = true;
    const final = finalVideoRef.current;
    if (final) {
      const playPromise = final.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
             if (!isHoveredRef.current && finalVideoRef.current) {
               finalVideoRef.current.pause();
             }
          })
          .catch((error) => {});
      }
    }
  };

  const handlePreviewMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    const final = finalVideoRef.current;
    if (final) {
      if (final.readyState >= 3) {
        final.pause();
      }
    }
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const playerContent = (
    <div 
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden select-none group touch-none transition-all duration-500 ${className} ${isFullscreen ? 'w-full h-full rounded-2xl border border-white/5 shadow-2xl' : (expanded ? 'rounded-none' : 'rounded-xl border border-white/5')}`}
      style={{ 
        '--slider-pos': '50%',
        '--slider-pos-val': '50',
        aspectRatio: aspectRatio ? aspectRatio : '9/16',
        height: isFullscreen ? '100%' : 'auto',
        maxHeight: isFullscreen ? 'none' : '82vh',
        maxWidth: isFullscreen ? 'none' : ((!aspectRatio || aspectRatio < 1) ? 'calc(82vh * 9 / 16)' : 'none')
      } as any}
    >
      <div 
        className="absolute inset-0 z-[40]"
        onClick={onVideoClick}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      <div className="absolute inset-0 z-0">
        <video 
          ref={rawVideoRef} 
          src={rawUrl} 
          loop 
          muted={isMuted} 
          playsInline 
          autoPlay={isFullscreen}
          onLoadedMetadata={(e) => handleMetadata(e, 'raw')} 
          className="w-full h-full object-cover transform-gpu" 
        />
      </div>

      <div className="absolute inset-0 z-10" style={{ clipPath: 'inset(0 0 0 var(--slider-pos))' }}>
        <video 
          ref={finalVideoRef} 
          src={finalUrl} 
          loop 
          muted={isMuted} 
          playsInline 
          autoPlay={isFullscreen}
          onLoadedMetadata={(e) => handleMetadata(e, 'final')} 
          className="w-full h-full object-cover transform-gpu" 
          style={{ willChange: 'transform, clip-path' }} 
        />
      </div>

      <div 
        className="absolute inset-y-0 z-50 w-10 -ml-5 cursor-ew-resize flex items-center justify-center touch-none group/divider"
        style={{ left: 'var(--slider-pos)' }}
        onPointerDown={(e) => { e.stopPropagation(); isDraggingRef.current = true; handlePointerMove(e); }}
      >
        {/* Sleek Visual Divider Line */}
        <div className="absolute inset-y-0 w-1 bg-white" />
        
        {/* Grab Circle Handle */}
        <div className="w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 transition-transform group-hover/divider:scale-110">
           <MoveHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* --- QUALITY BADGE --- */}
      <div className={qualityBadgeClassName || "absolute top-6 left-6 z-50 pointer-events-none"}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
          <div className={`w-1.5 h-1.5 rounded-full ${subscriptionTier === 'premium' ? 'bg-[#818cf8] animate-pulse shadow-[0_0_8px_#818cf8]' : 'bg-zinc-500'}`} />
          <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-white/90">
            {subscriptionTier === 'premium' ? '4K / LOSSLESS' : 'HD / STANDARD'}
          </span>
        </div>
      </div>

      {/* --- SIDE IDENTIFIERS --- */}
      <div 
        className="absolute top-[4.5rem] left-6 z-50 pointer-events-none transition-opacity duration-200"
        style={{ opacity: 'clamp(0, calc((var(--slider-pos-val) - 15) / 15), 1)' } as any}
      >
        <div className="px-2 py-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-sm">
           <span className="text-[8px] font-mono font-black text-white/40 uppercase tracking-[0.2em]">{beforeLabel}</span>
        </div>
      </div>
      <div 
        className="absolute top-[4.5rem] right-6 z-50 pointer-events-none transition-opacity duration-200"
        style={{ opacity: 'clamp(0, calc((85 - var(--slider-pos-val)) / 15), 1)' } as any}
      >
        <div className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
           <span className="text-[8px] font-mono font-black text-white/90 uppercase tracking-[0.2em]">{afterLabel}</span>
        </div>
      </div>

      {!hideControls && (
        <div className="absolute inset-x-0 bottom-0 z-50 p-6 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
           {/* Timeline Markers */}
           {timelineMarkers && timelineMarkers.length > 0 && (
             <div className="flex flex-wrap items-center gap-2 mb-4">
               <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">Jump to:</span>
               {timelineMarkers.map((marker, idx) => {
                 const colorClass = marker.color === 'purple' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20' :
                                    marker.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' :
                                    marker.color === 'amber' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' :
                                    'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10';
                 return (
                   <button
                     key={idx}
                     onClick={(e) => {
                       e.stopPropagation();
                       const final = finalVideoRef.current;
                       const raw = rawVideoRef.current;
                       if (final) final.currentTime = marker.timestamp;
                       if (raw) {
                         const offsetSec = syncOffsetMs / 1000;
                         raw.currentTime = Math.max(0, Math.min(raw.duration || Infinity, marker.timestamp + offsetSec));
                       }
                     }}
                     className={`px-3 py-1 text-[9px] uppercase tracking-wider font-semibold border rounded-full backdrop-blur-md transition-all duration-300 ${colorClass}`}
                   >
                     {marker.label}
                   </button>
                 );
               })}
             </div>
           )}
           <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shrink-0">
                 {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
               <div className="flex-1 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 relative group/seek">
                  <span ref={timeDisplayRef} className="text-xs font-mono text-zinc-400 shrink-0">0:00</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full relative">
                     <div ref={progressBarRef} className="absolute inset-y-0 left-0 bg-white rounded-full z-0" />
                     <input 
                        type="range"
                        min="0"
                        max={finalVideoRef.current?.duration || 0}
                        step="0.01"
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                  </div>
                  <span ref={durationDisplayRef} className="text-xs font-mono text-zinc-400 shrink-0">0:00</span>
               </div>
              <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="w-10 h-10 bg-black/40 border border-white/10 rounded-full flex items-center justify-center">
                 {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen} className="w-10 h-10 bg-white/10 hover:bg-white hover:text-black transition rounded-full flex items-center justify-center shrink-0">
                 <Maximize2 className="w-4 h-4" />
              </button>
           </div>
        </div>
      )}
    </div>
  );

  // If we are in card preview mode (not expanded and not fullscreen)
  if (!expanded && !isFullscreen) {
    return (
      <div 
        className={`relative w-full bg-[#050505] group cursor-pointer overflow-hidden border-zinc-900 rounded-xl border border-white/5 ${className}`}
        style={{ 
          aspectRatio: aspectRatio ? aspectRatio : '9/16',
          maxHeight: '82vh',
          maxWidth: (!aspectRatio || aspectRatio < 1) ? 'calc(82vh * 9 / 16)' : 'none'
        } as any}
        onMouseEnter={handlePreviewMouseEnter}
        onMouseLeave={handlePreviewMouseLeave}
        onClick={(e) => {
          if (onVideoClick) {
            onVideoClick(e);
          } else {
            setIsFullscreen(true);
            setIsPlaying(true);
          }
        }}
        onContextMenu={onContextMenu}
      >
        <video
          ref={finalVideoRef}
          src={finalUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          muted={isMuted}
          loop
          playsInline
          onLoadedMetadata={(e) => handleMetadata(e, 'final')}
        />

        <div className={qualityBadgeClassName || "absolute top-6 left-6 z-50 pointer-events-none"}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${subscriptionTier === 'premium' ? 'bg-[#818cf8] animate-pulse shadow-[0_0_8px_#818cf8]' : 'bg-zinc-500'}`} />
            <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-white/90">
              {subscriptionTier === 'premium' ? '4K / LOSSLESS' : 'HD / STANDARD'}
            </span>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between p-4 transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`}>
          <div />

          <div className="flex justify-center items-center">
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
               className="w-16 h-16 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
             >
                <Play className="w-6 h-6 fill-current ml-1" />
             </motion.div>
          </div>

          <div className="flex justify-between items-end">
             <div className="bg-black/80 backdrop-blur-2xl px-4 py-2 rounded-lg border border-white/5 text-[9px] uppercase tracking-[0.2em] text-white font-bold flex items-center gap-3">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" /> Slider Comparison
             </div>
             <div className="flex items-center gap-2 text-white/50 group-hover:text-white transition-colors duration-500">
                <span className="text-[10px] font-mono uppercase tracking-widest">Compare</span>
                <Maximize2 className="w-4 h-4" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  // If in fullscreen mode
  if (isFullscreen) {
    if (typeof window === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 z-[2147483647] bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden">
        {/* Security Layer Overlay */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

         {/* Left side actions bar (Vertical Stack) */}
         <div className="absolute top-6 left-6 lg:top-10 lg:left-10 flex flex-col gap-3 z-30">
           {/* Close Button */}
           <button 
             onClick={() => {
               setIsFullscreen(false);
             }}
             className="w-12 h-12 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full flex items-center justify-center transition-all z-20"
             title="Exit Focus Mode"
           >
             <X className="w-5 h-5" />
           </button>
         </div>
         
         {/* Info overlay (Shifted right of button stack) */}
         <div className="absolute top-6 left-24 lg:top-10 lg:left-32 text-white z-20 flex flex-col max-w-[calc(100vw-12rem)] md:max-w-xl">
            <div className="max-w-xl">
               <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-pulse" />
                  <p className="text-[9px] uppercase font-mono tracking-[0.4em] text-zinc-500">
                    Before & After slider comparison
                  </p>
               </div>
               <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none truncate">{title || "Untitled Masterpiece"}</h3>
            </div>
         </div>

        {/* Sliding Player centered with original aspect ratio */}
        <div 
          className="w-full relative z-10 flex items-center justify-center"
          style={{ 
            aspectRatio: aspectRatio ? aspectRatio : '16/9', 
            maxHeight: '85vh',
            maxWidth: aspectRatio ? `min(calc(85vh * ${aspectRatio}), 1152px)` : '1152px'
          }}
        >
          {playerContent}
        </div>

        {/* Interaction Hint */}
        <div className="absolute bottom-8 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] z-20">
           Studio Viewport Focus Mode
        </div>
      </div>,
      document.body
    );
  }

  // Expanded inline player (default fallback, e.g. review room)
  return playerContent;
});
