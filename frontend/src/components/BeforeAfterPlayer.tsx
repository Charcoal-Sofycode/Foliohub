'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, MoveHorizontal, X, Volume2, VolumeX, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';

interface BeforeAfterPlayerProps {
  rawUrl: string;
  finalUrl: string;
  title: string;
  className?: string;
  expanded?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterPlayer({ 
  rawUrl, 
  finalUrl, 
  title, 
  className = "", 
  expanded = false,
  beforeLabel = "Raw Footage",
  afterLabel = "Post Production"
}: BeforeAfterPlayerProps) {
  // Start playing automatically in expanded mode
  const [isPlaying, setIsPlaying] = useState(expanded);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const syncIntervalRef = useRef<number | null>(null);

  // ─── Video Synchronization ────────────────────────────────────────────────
  
  const syncVideos = useCallback(() => {
    if (!rawVideoRef.current || !finalVideoRef.current) return;
    
    const leader = rawVideoRef.current;
    const follower = finalVideoRef.current;

    // Strict time sync
    if (Math.abs(leader.currentTime - follower.currentTime) > 0.05) {
      follower.currentTime = leader.currentTime;
    }

    // Playback state sync
    if (leader.paused !== follower.paused) {
      if (leader.paused) follower.pause();
      else follower.play().catch(() => {});
    }

    syncIntervalRef.current = requestAnimationFrame(syncVideos);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      syncIntervalRef.current = requestAnimationFrame(syncVideos);
    } else {
      if (syncIntervalRef.current) cancelAnimationFrame(syncIntervalRef.current);
    }
    return () => {
      if (syncIntervalRef.current) cancelAnimationFrame(syncIntervalRef.current);
    };
  }, [isPlaying, syncVideos]);

  useEffect(() => {
    const v1 = rawVideoRef.current;
    const v2 = finalVideoRef.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      const p1 = v1.play();
      const p2 = v2.play();
      
      Promise.all([p1, p2]).catch((err) => {
        console.warn("Autoplay blocked or play interrupted", err);
        setIsPlaying(false);
      });
    } else {
      v1.pause();
      v2.pause();
    }
  }, [isPlaying]);

  // ─── Audio Handling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!rawVideoRef.current || !finalVideoRef.current) return;
    
    if (isMuted) {
      rawVideoRef.current.muted = true;
      finalVideoRef.current.muted = true;
    } else {
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

  const openFullscreen = (e?: React.MouseEvent) => {
    if (!expanded) {
      e?.stopPropagation();
      setIsFullscreen(true);
    }
  };

  // ─── Video Readiness ──────────────────────────────────────────────────────

  const handleCanPlay = () => {
    if (rawVideoRef.current && finalVideoRef.current) {
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
      className={`relative w-full h-full bg-[#030303] overflow-hidden select-none group touch-none ${className} ${expanded ? 'rounded-none' : 'rounded-xl cursor-zoom-in border border-white/5'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!expanded ? openFullscreen : undefined}
    >
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
            animate={{ opacity: (isHovered || !isPlaying) ? 1 : 0.3 }}
            className="flex flex-col gap-1"
         >
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Draft Source</span>
            <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded border border-white/5">
               <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">{beforeLabel}</h5>
            </div>
         </motion.div>

         <motion.div 
            animate={{ opacity: (isHovered || !isPlaying) ? 1 : 0.3 }}
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
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        <video
          ref={finalVideoRef}
          src={finalUrl}
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
        style={{ left: `${sliderPosition}%` }}
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
         <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4">
               <button 
                  onClick={togglePlay}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition active:scale-90"
               >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
               </button>
               
               <button 
                  onClick={toggleMute}
                  className="w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full flex items-center justify-center hover:scale-105 transition"
               >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
               </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                   <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">A/B Ratio</p>
                   <p className="text-[10px] font-bold text-white font-mono">{Math.round(sliderPosition)}% Revealed</p>
                </div>
                {!expanded && (
                  <button onClick={openFullscreen} className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white hover:text-black transition">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
            </div>
         </div>
      </motion.div>
    </div>
  );

  if (expanded) return PlayerContent;

  return (
    <>
      <div className={`w-full h-full ${className}`}>{PlayerContent}</div>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#020202] flex flex-col pt-safe"
          >
            {/* Fullscreen Header */}
            <div className="px-8 py-6 lg:px-12 flex justify-between items-center shrink-0 border-b border-white/5">
               <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <SlidersHorizontal className="w-3 h-3 text-[#6366f1]" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500">Dual-Buffer Analysis</span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{title}</h3>
               </div>
               <button 
                 onClick={() => setIsFullscreen(false)}
                 className="group w-12 h-12 bg-white/5 hover:bg-white text-zinc-500 hover:text-black rounded-full flex items-center justify-center transition-all duration-300"
               >
                 <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
               </button>
            </div>

            {/* Main Player Display */}
            <div className="flex-1 w-full h-full p-4 lg:p-12 overflow-hidden flex items-center justify-center">
               <div className="w-full h-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10">
                  <BeforeAfterPlayer 
                    rawUrl={rawUrl} 
                    finalUrl={finalUrl} 
                    title={title} 
                    expanded={true} 
                    beforeLabel={beforeLabel} 
                    afterLabel={afterLabel} 
                  />
               </div>
            </div>

            {/* Tips Section */}
            <div className="p-8 text-center text-zinc-600 font-mono text-[9px] uppercase tracking-[0.4em]">
                Tip: Audio levels crossfade dynamically with the slider
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
