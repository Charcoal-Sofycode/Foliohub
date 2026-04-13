import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Play, Volume2, VolumeX, X, Settings } from 'lucide-react';

export default function PortfolioPlayer({ url, title }: { url: string, title?: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const isHoveredRef = useRef(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    isHoveredRef.current = true;
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
             if (!isHoveredRef.current && videoRef.current) {
               videoRef.current.pause();
             }
          })
          .catch((error) => {
             // Silently catch AbortError
          });
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    if (videoRef.current) {
      // Browsers throw AbortError if pause is called before play resolves.
      // We rely on the .then() in play() to pause if hover is exited early.
      if (videoRef.current.readyState >= 3) {
         videoRef.current.pause();
      }
    }
  };

  return (
    <>
      {/* Inline Card Player */}
      <div 
        className="relative w-full h-full bg-[#050505] group cursor-pointer overflow-hidden border-zinc-900"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsFullscreen(true)}
      >
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          muted={isMuted}
          loop
          playsInline
        />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/30 flex flex-col justify-between p-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end">
             <button 
               onClick={(e) => { 
                 e.stopPropagation(); 
                 setIsMuted(!isMuted); 
               }}
               className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white hover:text-black transition"
             >
               {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
             </button>
          </div>
          <div className="flex justify-center items-center">
             <div className="w-12 h-12 rounded-full border border-white/30 bg-black/20 backdrop-blur-md flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500 delay-100">
                <Maximize2 className="w-5 h-5" />
             </div>
          </div>
          <div className="flex justify-start">
             <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded text-[10px] uppercase tracking-widest text-white/90 font-mono">
                Click to expand
             </div>
          </div>
        </div>
      </div>

      {/* Theater / Fullscreen Mode */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-12"
          >
             <button 
               onClick={() => { setIsFullscreen(false); }}
               className="absolute top-6 right-6 lg:top-10 lg:right-10 text-zinc-500 hover:text-white transition z-10"
             >
               <X className="w-8 h-8" />
             </button>
             
             <div className="absolute top-6 left-6 lg:top-10 lg:left-10 text-white z-10 flex items-center gap-12">
                <div>
                   <p className="text-xs uppercase font-mono tracking-[0.3em] text-zinc-500">Currently Playing</p>
                   <h3 className="text-2xl font-bold tracking-tight mt-2">{title || "Untitled Masterpiece"}</h3>
                </div>
                
                <div className="relative">
                   <button 
                     onClick={() => setQualityOpen(!qualityOpen)}
                     className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition"
                   >
                     <Settings className="w-3.5 h-3.5" /> {selectedQuality}
                   </button>
                   
                   <AnimatePresence>
                     {qualityOpen && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                         className="absolute top-full left-0 mt-4 w-48 bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-2xl z-50"
                       >
                         {['4K Lossless', '1080p HD', '720p Std'].map(q => (
                            <button 
                              key={q}
                              onClick={() => { setSelectedQuality(q); setQualityOpen(false); }}
                              className={`text-left px-4 py-3 text-xs font-mono tracking-widest uppercase transition ${selectedQuality === q ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                            >
                              {q}
                            </button>
                         ))}
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>

             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.1, duration: 0.4, ease: "backOut" }}
               className="w-full max-w-7xl aspect-video bg-[#050505] relative border border-white/10 shadow-2xl overflow-hidden rounded-lg"
             >
                <video
                  src={url}
                  className="w-full h-full object-contain"
                  autoPlay
                  controls
                  controlsList="nodownload"
                  playsInline
                />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
