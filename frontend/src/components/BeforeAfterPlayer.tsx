'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  qualityBadgeClassName
}: BeforeAfterPlayerProps, ref) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [rawReady, setRawReady] = useState(false);
  const [finalReady, setFinalReady] = useState(false);
  const isReady = rawReady && finalReady;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  
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

    // A. Playback Control & Sync Logic
    if (inCenter) {
      // Both must play and sync
      if (final.paused && isPlaying) final.play().catch(() => {});
      if (raw.paused && isPlaying) raw.play().catch(() => {});
      
      // Sync raw to final
      const drift = final.currentTime - raw.currentTime;
      if (Math.abs(drift) > 0.15) {
        raw.currentTime = final.currentTime;
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
      const minutes = Math.floor(leader.currentTime / 60);
      const seconds = Math.floor(leader.currentTime % 60);
      timeDisplayRef.current.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (onTimeUpdate) onTimeUpdate(leader.currentTime);

    // Update progress bar directly in DOM
    if (progressBarRef.current && leader.duration) {
      const progress = (leader.currentTime / leader.duration) * 100;
      progressBarRef.current.style.width = `${progress}%`;
    }

    // Update volume based on slider directly
    if (!isMuted) {
      const rawVol = Math.max(0, Math.min(1, pos / 100));
      const finalVol = Math.max(0, Math.min(1, (100 - pos) / 100));
      raw.volume = rawVol;
      final.volume = finalVol;
      raw.muted = rawVol < 0.01;
      final.muted = finalVol < 0.01;
    }

    // C. Continue Loop if master state is playing
    if (!leader.paused || isPlaying) {
      if ('requestVideoFrameCallback' in leader) {
        (leader as any).requestVideoFrameCallback(updateLoop);
      } else {
        requestAnimationFrame(updateLoop);
      }
    }
  }, [isMuted, isPlaying]);

  useEffect(() => {
    const raw = rawVideoRef.current;
    const final = finalVideoRef.current;
    if (raw?.readyState && raw.readyState >= 1) setRawReady(true);
    if (final?.readyState && final.readyState >= 1) setFinalReady(true);
  }, []);

  useEffect(() => {
    const leader = finalVideoRef.current;
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
        rawVideoRef.current.currentTime = finalVideoRef.current.currentTime;
      }
    };

    leader.addEventListener('play', handlePlay);
    leader.addEventListener('pause', handlePause);
    leader.addEventListener('seeked', handleSeeked);
    rawVideoRef.current?.addEventListener('play', handlePlay);
    rawVideoRef.current?.addEventListener('pause', handlePause);
    
    // Initial check
    if (!leader.paused || !rawVideoRef.current?.paused) handlePlay();

    return () => {
      leader.removeEventListener('play', handlePlay);
      leader.removeEventListener('pause', handlePause);
      leader.removeEventListener('seeked', handleSeeked);
      rawVideoRef.current?.removeEventListener('play', handlePlay);
      rawVideoRef.current?.removeEventListener('pause', handlePause);
    };
  }, [updateLoop, finalVideoRef]);

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
    if (raw) raw.currentTime = time;
    if (onTimeUpdate) onTimeUpdate(time);
    
    // Update progress bar immediately for visual feedback
    if (progressBarRef.current && durationRef.current) {
      const progress = (time / durationRef.current) * 100;
      progressBarRef.current.style.width = `${progress}%`;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden select-none group touch-none transition-all duration-500 ${className} ${isFullscreen ? 'fixed inset-0 z-[2147483647]' : (expanded ? 'rounded-none' : 'rounded-xl border border-white/5')}`}
      style={{ 
        '--slider-pos': '50%',
        '--slider-pos-val': '50',
        aspectRatio: isFullscreen ? 'auto' : (aspectRatio ? aspectRatio : '9/16'),
        height: isFullscreen ? '100vh' : 'auto',
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
        <video ref={rawVideoRef} src={rawUrl} loop muted={isMuted} playsInline onLoadedMetadata={(e) => handleMetadata(e, 'raw')} className="w-full h-full object-cover transform-gpu" />
      </div>

      <div className="absolute inset-0 z-10" style={{ clipPath: 'inset(0 0 0 var(--slider-pos))' }}>
        <video 
          ref={finalVideoRef} 
          src={finalUrl} 
          loop 
          muted={isMuted} 
          playsInline 
          onLoadedMetadata={(e) => handleMetadata(e, 'final')} 
          className="w-full h-full object-cover transform-gpu" 
          style={{ willChange: 'transform, clip-path' }} 
        />
      </div>

      <div 
        className="absolute inset-y-0 z-50 w-1 bg-white cursor-ew-resize flex items-center justify-center touch-none"
        style={{ left: 'var(--slider-pos)' }}
        onPointerDown={(e) => { e.stopPropagation(); isDraggingRef.current = true; handlePointerMove(e); }}
      >
        <div className="w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center">
           <MoveHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Center play button removed for cleaner look */}
      
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
           <span className="text-[8px] font-mono font-black text-white/40 uppercase tracking-[0.2em]">Raw Footage</span>
        </div>
      </div>
      <div 
        className="absolute top-[4.5rem] right-6 z-50 pointer-events-none transition-opacity duration-200"
        style={{ opacity: 'clamp(0, calc((85 - var(--slider-pos-val)) / 15), 1)' } as any}
      >
        <div className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]">
           <span className="text-[8px] font-mono font-black text-white/90 uppercase tracking-[0.2em]">Post Processed</span>
        </div>
      </div>

      {!hideControls && (
        <div className="absolute inset-x-0 bottom-0 z-50 p-6 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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

      {isFullscreen && (
        <button onClick={toggleFullscreen} className="absolute top-6 right-6 z-[100] w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl">
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
});
