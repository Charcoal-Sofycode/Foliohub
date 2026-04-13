'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, MoveHorizontal, X } from 'lucide-react';

interface BeforeAfterPlayerProps {
  rawUrl: string;
  finalUrl: string;
  title: string;
  className?: string;
  expanded?: boolean;
}

export default function BeforeAfterPlayer({ rawUrl, finalUrl, title, className = "", expanded = false }: BeforeAfterPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(expanded); // Auto-play if opened in expanded mode
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const isHoveredRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const toggleFullscreen = (e: MouseEvent) => {
    e.stopPropagation();
    if (!expanded) {
      setIsFullscreen(true);
    }
  };

  // Safe play helper function
  const attemptPlay = (video: HTMLVideoElement | null) => {
    if (video) {
       const playPromise = video.play();
       if (playPromise !== undefined) {
         playPromise.then(() => {
            if (!isHoveredRef.current && !expanded) {
               video.pause();
            }
         }).catch(() => {
            // Silently catch AbortError
         });
       }
    }
  };

  const attemptPause = (video: HTMLVideoElement | null) => {
    if (video && video.readyState >= 3) {
      video.pause();
    }
  };

  useEffect(() => {
    if (isPlaying) {
      attemptPlay(rawVideoRef.current);
      attemptPlay(finalVideoRef.current);
    } else {
      attemptPause(rawVideoRef.current);
      attemptPause(finalVideoRef.current);
    }
  }, [isPlaying]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    isHoveredRef.current = true;
    if (!expanded) {
       setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    if (!isDragging) setIsDragging(false);
    if (!expanded) {
       setIsPlaying(false);
    }
  };

  const togglePlay = (e: MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  // Main UI
  const PlayerUI = (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-[#050505] group overflow-hidden ${className} ${expanded ? '' : 'cursor-pointer'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!expanded ? toggleFullscreen : undefined}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          ref={rawVideoRef}
          src={rawUrl}
          loop
          muted={!expanded}
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <div 
        className="absolute inset-0 z-10 pointer-events-none border-l border-white/20"
        style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
      >
        <video
          ref={finalVideoRef}
          src={finalUrl}
          loop
          muted={!expanded}
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <div 
        className="absolute inset-0 z-20 cursor-ew-resize touch-none"
        onPointerDown={handlePointerDown}
      >
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] -ml-[1px]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-black rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
            <MoveHorizontal className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono uppercase tracking-widest rounded-sm opacity-70 group-hover:opacity-100 transition">Raw/Draft</span>
        </div>
        <div className="absolute top-4 right-4 text-right">
          <span className="px-3 py-1 bg-white text-black text-[10px] font-mono uppercase tracking-widest font-bold rounded-sm shadow-xl opacity-70 group-hover:opacity-100 transition">Final Edit</span>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered || expanded || isDragging ? 1 : 0 }}
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent z-40 flex items-end p-4 pointer-events-auto filter drop-shadow-xl"
      >
        <div className="flex items-center justify-between w-full">
          <button 
            onClick={togglePlay}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-1" fill="currentColor" />}
          </button>
          
          {!expanded && (
            <button onClick={toggleFullscreen} className="w-10 h-10 bg-black/50 text-white backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black transition">
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  if (expanded) return PlayerUI;

  return (
    <>
      {PlayerUI}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
          >
            <div className="absolute top-0 inset-x-0 p-6 lg:p-12 flex justify-between items-start z-50 pointer-events-none">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-[0.3em] text-zinc-500 mb-2 pointer-events-auto">Currently Interacting</p>
                <h3 className="text-2xl font-bold text-white tracking-tight pointer-events-auto">{title}</h3>
              </div>
              <button 
                onClick={() => setIsFullscreen(false)}
                className="w-12 h-12 rounded-full border border-zinc-800 bg-black/50 backdrop-blur text-zinc-400 hover:text-white hover:border-white transition flex items-center justify-center pointer-events-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 w-full h-full p-6 lg:p-24 pt-32 lg:pt-32">
              <div className="w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
                 <BeforeAfterPlayer rawUrl={rawUrl} finalUrl={finalUrl} title={title} expanded={true} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
