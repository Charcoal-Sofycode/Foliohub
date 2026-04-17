import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Play, Volume2, VolumeX, X, Settings } from 'lucide-react';

export default function PortfolioPlayer({ 
  url, 
  title, 
  optimizedUrl, 
  transcodingStatus 
}: { 
  url: string, 
  title?: string, 
  optimizedUrl?: string, 
  transcodingStatus?: string 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(optimizedUrl ? 'Web Optimized' : '4K Lossless');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Source priority: Optimized > URL
  const activeUrl = (optimizedUrl && transcodingStatus === 'completed') ? optimizedUrl : url;
  const isProcessing = transcodingStatus === 'processing' || transcodingStatus === 'pending';

  // Debug logging to help identify why overlay might persist
  useEffect(() => {
    if (transcodingStatus === 'completed') {
      console.log(`DEBUG: Project "${title}" optimization complete. Overlay should hide.`);
    }
  }, [transcodingStatus, title]);

  const isHoveredRef = useRef(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    isHoveredRef.current = true;
    if (videoRef.current && !isProcessing) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
             if (!isHoveredRef.current && videoRef.current) {
               videoRef.current.pause();
             }
          })
          .catch((error) => {});
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    if (videoRef.current) {
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
          src={activeUrl}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${isProcessing ? 'opacity-30 grayscale' : ''}`}
          muted={isMuted}
          loop
          playsInline
        />

        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-white font-bold mb-1">Optimizing Studio Master</p>
            <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Preparing high-performance version...</p>
          </div>
        )}
        
        {/* Hover Overlay */}
        {!isProcessing && (
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
               <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded text-[10px] uppercase tracking-widest text-white/90 font-mono flex items-center gap-2">
                  <Play className="w-2.5 h-2.5 fill-white" /> Expand Studio View
               </div>
            </div>
          </div>
        )}
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
             
             <div className="absolute top-6 left-6 lg:top-10 lg:left-10 text-white z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                <div>
                   <p className="text-xs uppercase font-mono tracking-[0.3em] text-zinc-500">
                     {isProcessing ? 'Master Status: Processing' : 'Master Status: Live'}
                   </p>
                   <h3 className="text-2xl font-bold tracking-tight mt-2">{title || "Untitled Masterpiece"}</h3>
                </div>
                
                {!isProcessing && (
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
                           {[
                             {id: 'raw', label: '4K Lossless', sub: 'Original Master'},
                             {id: 'web', label: 'Web Optimized', sub: 'High Speed Content'},
                           ].map(q => (
                              <button 
                                key={q.id}
                                onClick={() => { setSelectedQuality(q.label); setQualityOpen(false); }}
                                className={`text-left px-4 py-4 transition flex flex-col gap-1 ${selectedQuality === q.label ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                              >
                                <span className="text-[10px] font-bold tracking-widest uppercase">{q.label}</span>
                                <span className="text-[8px] font-mono uppercase opacity-50">{q.sub}</span>
                              </button>
                           ))}
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </div>
                )}
             </div>

             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.1, duration: 0.4, ease: "backOut" }}
               className="w-full max-w-7xl aspect-video bg-[#050505] relative border border-white/10 shadow-2xl overflow-hidden rounded-lg"
             >
                {isProcessing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-8" />
                    <h4 className="text-xl font-black uppercase tracking-widest mb-2">Video Processing</h4>
                    <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">We are preparing a web-optimized stream for this masterwork.</p>
                  </div>
                ) : (
                  <video
                    src={selectedQuality === '4K Lossless' ? url : (optimizedUrl || url)}
                    className="w-full h-full object-contain"
                    autoPlay
                    controls
                    controlsList="nodownload"
                    playsInline
                  />
                )}
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
