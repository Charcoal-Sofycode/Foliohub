'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, MoveHorizontal, X, Volume2, VolumeX, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';

interface BeforeAfterPlayerProps {
  rawUrl: string;
  finalUrl: string;
  title: string;
  thumbnailUrl?: string;
  className?: string;
  expanded?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterPlayer({ 
  rawUrl, 
  finalUrl, 
  title, 
  thumbnailUrl,
  className = "", 
  expanded = false,
  beforeLabel = "Raw Footage",
  afterLabel = "Post Production"
}: BeforeAfterPlayerProps) {
  // Autoplay disabled
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const syncIntervalRef = useRef<number | null>(null);

  // ─── Video Synchronization ────────────────────────────────────────────────
  
  // ─── Video Synchronization ────────────────────────────────────────────────
  
  const syncVideos = useCallback(() => {
    const leader = finalVideoRef.current; // Final Master is the leader
    const follower = rawVideoRef.current; 
    if (!leader || !follower || isSeeking) return;
    
    // Playback state sync
    if (leader.paused !== follower.paused) {
      if (leader.paused) follower.pause();
      else follower.play().catch(() => {});
    }

    const drift = Math.abs(leader.currentTime - follower.currentTime);
    
    // SYNC STRATEGY:
    // 1. If drift is extreme (> 0.3s) or seeking/looping, force hard seek
    // 2. If drift is moderate (0.04s - 0.3s), adjust playback rate for smooth catch-up
    // 3. If drift is tiny (< 0.04s), do nothing to allow natural playback
    
    if (drift > 0.3 || leader.seeking || (leader.currentTime < 0.2 && follower.currentTime > 1)) {
      follower.currentTime = leader.currentTime;
      follower.playbackRate = leader.playbackRate;
    } else if (drift > 0.04) {
      // Smoothly adjust speed to catch up (±10% speed)
      const speedAdjust = leader.currentTime > follower.currentTime ? 1.1 : 0.9;
      follower.playbackRate = leader.playbackRate * speedAdjust;
    } else {
      // Revert to normal speed when in sync
      if (follower.playbackRate !== leader.playbackRate) {
        follower.playbackRate = leader.playbackRate;
      }
    }

    // Update progress state (Throttled to avoid excessive re-renders)
    // Only update state if it changed by more than 0.1s or for very short videos
    if (Math.abs(leader.currentTime - currentTime) > 0.1 || duration < 5) {
        setCurrentTime(leader.currentTime);
    }

    syncIntervalRef.current = requestAnimationFrame(syncVideos);
  }, [isSeeking, currentTime, duration]);

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
    const v1 = rawVideoRef.current;
    const v2 = finalVideoRef.current;
    if (!v1 || !v2 || !isReady) return;

    if (isPlaying) {
      v1.play().catch(() => setIsPlaying(false));
      v2.play().catch(() => setIsPlaying(false));
    } else {
      v1.pause();
      v2.pause();
    }
  }, [isPlaying, isReady]);

  // ─── Audio Handling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!rawVideoRef.current || !finalVideoRef.current) return;
    
    // Cross-fade logic for audio based on slider position
    if (isMuted) {
      rawVideoRef.current.muted = true;
      finalVideoRef.current.muted = true;
    } else {
      // CORRECTED: As sliderPosition increases (moving right), we reveal MORE of the RAW video
      // because the Final layer is inset from the left.
      // sliderPosition 0 = Final Edit (Full)
      // sliderPosition 100 = Raw Footage (Full)
      
      const rawVol = Math.max(0, Math.min(1, sliderPosition / 100));
      const finalVol = Math.max(0, Math.min(1, (100 - sliderPosition) / 100));
      
      rawVideoRef.current.muted = false;
      finalVideoRef.current.muted = false;
      rawVideoRef.current.volume = rawVol;
      finalVideoRef.current.volume = finalVol;
    }
  }, [sliderPosition, isMuted]);

  // ─── Interaction Handlers ──────────────────────────────────────────────────

  const handlePointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    
    // 1. Direct DOM update for maximum performance (visuals)
    containerRef.current.style.setProperty('--slider-pos', `${percentage}%`);
    
    // 2. State update for non-visual logic (audio, labels) - still needed but React will batch it
    setSliderPosition(percentage);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Avoid triggering fullview click when grabbing slider
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
        // Fallback to CSS fullscreen
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

  // ─── Video Readiness ──────────────────────────────────────────────────────

  const handleCanPlay = () => {
    if (rawVideoRef.current && finalVideoRef.current) {
        if (finalVideoRef.current.duration) {
            setDuration(finalVideoRef.current.duration);
        }
        // Redundancy check for readiness
        if (rawVideoRef.current.readyState >= 2 && finalVideoRef.current.readyState >= 2) {
            setIsReady(true);
        }
    }
  };

  const handleError = (e: any) => {
    const video = e.target as HTMLVideoElement;
    console.error("Video loading error:", {
      code: video.error?.code,
      message: video.error?.message,
      src: video.src
    });
    setLoadError(`Playback failed (Error ${video.error?.code || 'Unknown'}). Check network tab or video format.`);
  };

  // ─── Render UI ────────────────────────────────────────────────────────────

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
      {/* FULLSCREEN CLOSE BUTTON (For CSS fallback or non-native browsers) */}
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
      {/* ERROR STATE */}
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

      {/* LOADING STATE */}
      {!isReady && !loadError && (
        <div className="absolute inset-0 z-[60] bg-[#050505] flex flex-col items-center justify-center gap-4 transition-opacity duration-700">
           <div className="w-6 h-6 border-2 border-white/5 border-t-white rounded-full animate-spin" />
           <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.4em]">Initializing Dual-Source</p>
        </div>
      )}

      {/* NO PLAYBACK OVERLAY (Click to Start if browser blocked autoplay) */}
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

      {/* Helper Labels (Overlay) */}
       <div className="absolute inset-x-0 top-0 z-40 pointer-events-none p-6 flex justify-between items-start">
         <motion.div 
            animate={{ 
              opacity: sliderPosition > 10 
                ? (isHovered || !isPlaying || expanded ? 1 : 0.3) 
                : 0 
            }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-1"
         >
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Draft Source</span>
            <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/5">
               <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{beforeLabel}</h5>
            </div>
         </motion.div>

         <motion.div 
            animate={{ 
              opacity: sliderPosition < 90 
                ? (isHovered || !isPlaying || expanded ? 1 : 0.3) 
                : 0 
            }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-1 items-end text-right"
         >
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Final Master</span>
            <div className="px-3 py-1 bg-white backdrop-blur-md rounded border border-white/5">
               <h5 className="text-[10px] font-bold text-black uppercase tracking-wider">{afterLabel}</h5>
            </div>
         </motion.div>
      </div>

      {/* Video Layers */}
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

      <div 
        className="absolute inset-0 z-10"
        style={{ clipPath: 'inset(0 0 0 var(--slider-pos))' }}
      >
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

      {/* SECURITY SHIELD: Blocks right-clicking on either layer */}
      <div 
        className="absolute inset-0 z-30 pointer-events-none" 
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Interactive Slider Bar */}
      <div 
        className="absolute inset-y-0 z-50 w-1 bg-white cursor-ew-resize group/slider flex items-center justify-center touch-none"
        style={{ left: 'var(--slider-pos)' }}
        onPointerDown={onPointerDown}
      >
        <div className="relative w-10 h-10 bg-white rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform group-hover/slider:scale-110 active:scale-90">
           <MoveHorizontal className="w-5 h-5 text-black" />
           <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-10" />
        </div>
        {/* Glow Line */}
        <div className="absolute inset-y-0 w-[1px] bg-white blur-[2px] opacity-50" />
      </div>

      {/* Global Play Hint on Hover */}
      <AnimatePresence>
        {!isPlaying && isReady && !expanded && isHovered && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[42] flex items-center justify-center pointer-events-none"
          >
             <div className="px-6 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-[0.3em] rounded-full shadow-2xl">
                Start Interaction
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: (isHovered || isDragging || !isPlaying || expanded) ? 0 : 40, opacity: (isHovered || isDragging || !isPlaying || expanded) ? 1 : 0 }}
        className="absolute inset-x-0 bottom-0 z-50 p-6 bg-gradient-to-t from-black via-black/40 to-transparent"
      >
         <div className="flex items-center justify-between gap-6 pointer-events-auto">
            <div className="flex items-center gap-4 flex-1">
               <button 
                  onClick={togglePlay}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition active:scale-90 shrink-0"
               >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
               </button>

               {/* TIMELINE */}
               <div className="flex-1 flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-400 w-10 text-right">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1.5 group/timeline">
                     <input 
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.01}
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseDown={() => setIsSeeking(true)}
                        onMouseUp={() => setIsSeeking(false)}
                        onTouchStart={() => setIsSeeking(true)}
                        onTouchEnd={() => setIsSeeking(false)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                           className="h-full bg-white relative"
                           style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        >
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/timeline:scale-100 transition-transform" />
                        </motion.div>
                     </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 w-10">{formatTime(duration)}</span>
               </div>
               
               <button 
                  onClick={toggleMute}
                  className="w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full flex items-center justify-center hover:scale-105 transition shrink-0"
               >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
               </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end mr-2">
                   <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">A/B Ratio</p>
                   <p className="text-[10px] font-bold text-white font-mono">{Math.round(sliderPosition)}% Revealed</p>
                </div>
                {!expanded && (
                  <button 
                    onClick={toggleFullscreen} 
                    className={`w-10 h-10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center transition ${isFullscreen ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white hover:text-black'}`}
                  >
                    {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                )}
            </div>
         </div>
      </motion.div>
    </div>
  );

  return PlayerContent;
}
