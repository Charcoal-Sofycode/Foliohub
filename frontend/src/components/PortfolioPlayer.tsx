import { useState, useRef } from 'react';
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
  const hasFailed = transcodingStatus === 'failed';


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
        onContextMenu={(e) => e.preventDefault()}
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

        {/* Failed optimization — silent badge, video still plays */}
        {hasFailed && (
          <div className="absolute top-3 right-3 bg-amber-500/10 border border-amber-500/20 rounded-sm px-2 py-1 pointer-events-none">
            <p className="text-[8px] uppercase tracking-widest text-amber-400/70 font-mono">Original Quality</p>
          </div>
        )}
        
        {/* Hover Overlay */}
        {!isProcessing && (
          <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between p-4 transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`}>
            <div className="flex justify-end">
               <button 
                 onClick={(e) => { 
                   e.stopPropagation(); 
                   setIsMuted(!isMuted); 
                 }}
                 className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
               >
                 {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
               </button>
            </div>
            
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
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Master File Available
               </div>
               <div className="flex items-center gap-2 text-white/50 group-hover:text-white transition-colors duration-500">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Select</span>
                  <Maximize2 className="w-4 h-4" />
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
            className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden"
          >
             {/* Security Layer Overlay */}
             <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
             <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

             <button 
               onClick={() => { setIsFullscreen(false); }}
               className="absolute top-6 right-6 lg:top-10 lg:right-10 w-12 h-12 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full flex items-center justify-center transition-all z-20"
             >
               <X className="w-6 h-6" />
             </button>
             
             <div className="absolute top-6 left-6 lg:top-10 lg:left-10 text-white z-20 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                <div className="max-w-xl">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-white rounded-full" />
                      <p className="text-[9px] uppercase font-mono tracking-[0.4em] text-zinc-500">
                        {isProcessing ? 'Studio Master: Processing' : 'Studio Master: Live'}
                      </p>
                   </div>
                   <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">{title || "Untitled Masterpiece"}</h3>
                </div>
                
                {!isProcessing && (
                  <div className="relative pt-2 md:pt-0">
                     <button 
                       onClick={() => setQualityOpen(!qualityOpen)}
                       className="flex items-center gap-3 px-6 py-3 bg-zinc-900/40 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all"
                     >
                       <Settings className="w-3.5 h-3.5" /> {selectedQuality}
                     </button>
                     
                     <AnimatePresence>
                       {qualityOpen && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                           className="absolute top-full left-0 mt-4 w-56 bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-[250]"
                         >
                           {[
                             {id: 'raw', label: '4K Lossless', sub: 'Native Quality (Slower)'},
                             {id: 'web', label: 'Web Optimized', sub: 'Instant Playback'},
                           ].map(q => (
                              <button 
                                key={q.id}
                                onClick={() => { setSelectedQuality(q.label); setQualityOpen(false); }}
                                className={`text-left px-5 py-5 transition flex flex-col gap-1.5 ${selectedQuality === q.label ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                              >
                                <span className="text-[11px] font-bold tracking-[0.1em] uppercase">{q.label}</span>
                                <span className="text-[8px] font-mono uppercase opacity-60">{q.sub}</span>
                              </button>
                           ))}
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </div>
                )}
             </div>

             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
               className="w-full max-w-6xl aspect-video bg-[#020202] relative border border-white/5 shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden rounded-2xl z-10"
             >
                {isProcessing ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] p-12 text-center">
                     <div className="w-16 h-16 border-2 border-white/5 border-t-white rounded-full animate-spin mb-10" />
                     <h4 className="text-2xl font-black uppercase tracking-[0.3em] mb-3">Engine in Motion</h4>
                     <p className="text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase max-w-sm leading-relaxed">Encoding a high-performance web stream for this professional asset.</p>
                   </div>
                ) : (
                  <div 
                    className="relative w-full h-full group bg-black"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <video
                      key={selectedQuality}
                      src={selectedQuality === '4K Lossless' ? url : (optimizedUrl || url)}
                      className="w-full h-full object-contain"
                      autoPlay
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      playsInline
                    />
                  </div>
                )}
             </motion.div>
             
             {/* Interaction Hint */}
             <div className="absolute bottom-8 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] z-20">
                Studio Viewport Focus Mode
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
