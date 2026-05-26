// src/app/page.tsx
'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Play, ArrowRight, Aperture, MousePointer2, Sparkles, MessageSquare, Shield, Sliders, Layers, ChevronRight, Zap } from 'lucide-react';
import FolioLogo from '@/components/FolioLogo';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Hero Video scaling & fading on scroll
  const videoScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.15]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.25]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [0, 200]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  // Features Section transforms
  const featuresOpacity = useTransform(scrollYProgress, [0.12, 0.22], [0, 1]);
  const featuresY = useTransform(scrollYProgress, [0.12, 0.22], [80, 0]);
  
  // Custom Cursor
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  useEffect(() => {
    const updateMousePos = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePos);
    return () => window.removeEventListener('mousemove', updateMousePos);
  }, []);

  /* ─── Interactive Feature Mockup States ─── */
  // 1. Before/After Color Grading Slider
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0-100
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
  };

  // 2. Production Story Interactive Stepper
  const [activeStoryStage, setActiveStoryStage] = useState<'brief' | 'storyboard' | 'rough' | 'revisions' | 'final'>('brief');
  const storyStages = {
    brief: {
      title: "01. Client Brief & Scope",
      desc: "Securely outline the visual language, raw mood boards, and aesthetic direction before any camera rolling. Avoid misaligned creative expectations.",
      notes: "Vibe: Cyperpunk noir, heavy rain elements. Aspect ratio: 2.39:1 anamorphic."
    },
    storyboard: {
      title: "02. Anamorphic Storyboard",
      desc: "Upload grid shots, framing references, and shot lists. Track dynamic feedback on each shot sequence prior to principal assembly.",
      notes: "Shot 12: Low angle wide tracking shot of protagonist. Shot 15: Neon focus pull."
    },
    rough: {
      title: "03. Assembly & Rough Cut",
      desc: "First visual stitching. Allow clients to feel the initial pacing and sync before committing to expensive color grading or sound design.",
      notes: "Tempo matches the synthesized bassline. Trim 2 seconds off the intro transition."
    },
    revisions: {
      title: "04. Frame-Accurate Feedback",
      desc: "Iterate effortlessly. Clients mark specific frames to request modifications, preventing messy email chains or timestamps mismatches.",
      notes: "Round 2 Revision: 'Increase exposure on the shadow area here at 01:24:12.'"
    },
    final: {
      title: "05. Master Render Export",
      desc: "Approved master delivery. Showcase final 4K edge-streamed renders and delivery technical metadata directly to high-profile clients.",
      notes: "Final approved 4K ProRes 422 HQ master. Subdomain deploy active."
    }
  };

  // 3. AI Matchmaker Interactive Demo
  const [aiQuery, setAiQuery] = useState('');
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiMatchScore, setAiMatchScore] = useState<number | null>(null);
  const [aiMatchedEditor, setAiMatchedEditor] = useState<string | null>(null);

  const triggerAiMatchDemo = (vibe: string) => {
    setAiQuery(vibe);
    setIsAiScanning(true);
    setAiMatchScore(null);
    
    setTimeout(() => {
      setIsAiScanning(false);
      setAiMatchScore(98);
      setAiMatchedEditor(
        vibe.includes('Thriller') ? 'Marcus Sterling (Noir Specialist)' :
        vibe.includes('Retro') ? 'Clara Vance (VHS & Analog Editor)' :
        'Siddharth Patel (High-Octane Commercials)'
      );
    }, 1800);
  };

  // 4. Frame-Accurate Feedback Popups
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(1);
  const mockComments = [
    { id: 1, timestamp: "00:14", author: "Sarah (Agency Director)", text: "Make the lighting on his face slightly warmer here. The grade feels too green.", color: "border-amber-500" },
    { id: 2, timestamp: "00:32", author: "Devin (Lead Editor)", text: "Agreed. Added a warm power window tracking her face to lift the midtones.", color: "border-indigo-400" },
    { id: 3, timestamp: "00:48", author: "Sarah (Agency Director)", text: "Perfect contrast ratio! This cut is absolutely solid. Let's export.", color: "border-emerald-500" }
  ];

  return (
    <main ref={containerRef} className="bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden relative">
      

      {/* Custom Cursor (Cinematic Viewfinder Style) */}
      <AnimatePresence>
        {isHoveringHero && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-0 left-0 w-36 h-20 border border-white/20 rounded z-[100] pointer-events-none mix-blend-difference flex flex-col justify-between p-2 select-none"
            style={{ 
              x: mousePosition.x - 72, 
              y: mousePosition.y - 40,
              transition: 'transform 0.08s ease-out'
            }}
          >
            {/* Viewfinder focus brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white"></div>

            {/* Top row: Pulse REC dot & quality codec */}
            <div className="flex justify-between items-center text-[7px] font-mono tracking-widest uppercase text-white font-bold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                <span>REC</span>
              </span>
              <span>10-BIT</span>
            </div>

            {/* Center Focus Target */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Bottom row: Play command and dynamic position timecodes */}
            <div className="flex justify-between items-end text-[7px] font-mono tracking-widest text-white">
              <span>PLAY REEL</span>
              <span className="font-bold">
                00:{Math.floor(mousePosition.x / 12) % 60 < 10 ? `0${Math.floor(mousePosition.x / 12) % 60}` : Math.floor(mousePosition.x / 12) % 60}:
                {Math.floor(mousePosition.y / 12) % 60 < 10 ? `0${Math.floor(mousePosition.y / 12) % 60}` : Math.floor(mousePosition.y / 12) % 60}:
                {Math.floor(mousePosition.x + mousePosition.y) % 24 < 10 ? `0${Math.floor(mousePosition.x + mousePosition.y) % 24}` : Math.floor(mousePosition.x + mousePosition.y) % 24}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avant-Garde Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 mix-blend-difference px-6 sm:px-8 lg:px-12 py-6 sm:py-8 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
           <FolioLogo iconSize={20} className="sm:text-xl" />
        </div>
        <div className="hidden sm:flex gap-8 pointer-events-auto items-center">
          <Link href="/portfolios" className="text-xs uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Explore Creators</Link>
          <Link href="/match" className="text-xs uppercase tracking-[0.2em] hover:text-indigo-400 transition-colors flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Match</Link>
          <Link href="/login" className="text-xs uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Login</Link>
          <Link href="/signup" className="text-xs uppercase tracking-[0.2em] relative overflow-hidden group">
            <span className="block group-hover:-translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]">Studio Setup</span>
            <span className="block absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] font-bold">Studio Setup</span>
          </Link>
        </div>
        <div className="flex sm:hidden gap-4 pointer-events-auto items-center">
            <Link href="/match" className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">AI Match</Link>
            <Link href="/login" className="text-[10px] uppercase tracking-[0.2em]">Login</Link>
            <Link href="/signup" className="text-[10px] uppercase tracking-[0.2em] font-bold">Studio</Link>
        </div>
      </nav>

      {/* 
        SECTION 1: MASSIVE CINEMATIC HERO 
        Now optimized to pull lightweight local webm & mp4 files instantly.
      */}
      <div 
        className="h-[110vh] relative w-full"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        <div className="sticky top-0 w-full h-screen overflow-hidden">
          <div className="w-full h-full relative bg-[#030303]" key="hero-video-lite">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              preload="auto"
              className="w-full h-full object-cover relative z-0 opacity-70 filter brightness-[0.85] contrast-[1.05]"
              onContextMenu={(e) => e.preventDefault()}
              controlsList="nodownload"
              disablePictureInPicture
            >
              <source src="/hero-video-opt.webm" type="video/webm" />
              <source src="/hero-video-opt.mp4" type="video/mp4" />
            </video>
            {/* Dark Anamorphic Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-[#050505] z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient pointer-events-none z-10 opacity-30" />
          </div>

          <motion.div 
            style={{ y: titleY, opacity: titleOpacity }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none px-6"
          >
            <h1 className="text-[13vw] sm:text-[9vw] font-bold tracking-tighter leading-[0.8] mb-6 uppercase flex flex-col">
              <span className="overflow-hidden"><motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="block">The Director's</motion.span></span>
              <span className="overflow-hidden font-serif italic text-zinc-400"><motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.08 }} className="block">Showcase.</motion.span></span>
            </h1>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.8, duration: 1.5 }}
              className="mt-6 sm:mt-10 flex flex-col items-center gap-4"
            >
              <MousePointer2 className="w-5 h-5 opacity-40 animate-bounce hidden sm:block" />
              <p className="text-[9px] tracking-[0.4em] uppercase opacity-40 font-mono">Scroll to Discover the Toolkit</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* 
        SECTION 1.5: AESTHETIC DNA FINGERPRINT SHOWCASE
        A widescreen cinematic visualization filling the transition gap.
      */}
      <div className="relative w-full bg-[#050505] border-t border-b border-zinc-900/50 px-6 sm:px-8 lg:px-12 xl:px-24 py-12 z-30">
        <div className="max-w-[90rem] mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* Left Column: Descriptions */}
            <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/40 text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-6 self-start">
                <Aperture className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" /> Style DNA Engine
              </div>
              <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-6">
                Your Creative Signature.<br/>
                <span className="font-serif italic font-light text-zinc-400 normal-case lowercase leading-none">analyzed.</span>
              </h3>
              <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed mb-8">
                Skip the generic bullet points. Foliohub automatically parses your visual pacing, cutting speeds, and color grading palettes to map your unique **Style DNA Fingerprint**. Premium directors and agencies can search, filter, and discover your capability profile via a scientific aesthetic spectrum.
              </p>
              <div className="flex items-center gap-6 text-xs font-mono uppercase tracking-widest text-zinc-500 flex-wrap">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Color DNA</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Cut Speeds</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Contrast Shadow</span>
              </div>
            </div>

            {/* Right Column: High-End DNA Spectrum Interactive Visualization */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="bg-[#090909] border border-zinc-900 rounded-xl p-8 shadow-xl flex flex-col gap-6 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                 
                 {/* Live Grading Bars */}
                 <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-4">
                    <span>Aesthetic Spectral Mapping</span>
                    <span>ACTIVE TRANSCODE ANALYZER</span>
                 </div>

                 {/* Spectrum Grid */}
                 <div className="grid grid-cols-6 gap-2 h-40 items-end">
                    {[70, 45, 90, 60, 80, 50].map((height, i) => (
                      <div key={`dna-bar-${i}`} className="bg-zinc-950 rounded border border-zinc-900/60 h-full flex flex-col justify-end overflow-hidden p-1">
                        <motion.div 
                          initial={{ height: 0 }} 
                          animate={{ height: `${height}%` }} 
                          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.15 }}
                          className={`w-full rounded-sm bg-gradient-to-t ${
                            i === 0 ? 'from-cyan-950 to-cyan-500' :
                            i === 1 ? 'from-indigo-950 to-indigo-500' :
                            i === 2 ? 'from-purple-950 to-purple-500' :
                            i === 3 ? 'from-pink-950 to-pink-500' :
                            i === 4 ? 'from-amber-950 to-amber-500' :
                            'from-emerald-950 to-emerald-500'
                          }`}
                        />
                      </div>
                    ))}
                 </div>

                 {/* Simulated Console Logs */}
                 <div className="bg-black border border-zinc-900 rounded p-4 font-mono text-[9px] text-zinc-500 flex flex-col gap-1">
                    <span className="text-emerald-400 font-bold">&gt; Style DNA Ingestion Complete:</span>
                    <span>Pacing Ratio: High-Velocity Cuts Detected (Music Videos / Action)</span>
                    <span>Color Space: Cinematic Teal-Orange (3200K Shadow / 5600K Highlights)</span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 
        SECTION 2: CORE VALUE STATEMENT
      */}
      <div className="relative w-full bg-[#050505] z-30 px-6 sm:px-8 lg:px-12 xl:px-24 flex items-center justify-center py-12">

        <motion.div style={{ opacity: featuresOpacity, y: featuresY }} className="max-w-[90rem] w-full z-10 relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* Left Column: Big visual typography */}
            <div className="lg:col-span-5 border-l border-white/10 pl-6 sm:pl-10">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-3">Designed for High-Bitrate Auteurs</span>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-none uppercase">
                YOUR CUT. <br />
                <span className="font-serif italic text-zinc-400 font-light">UNCOMPRESSED.</span> <br />
                YOUR WAY.
              </h2>
            </div>
            
            {/* Right Column: Descriptions and cards */}
            <div className="lg:col-span-7 flex flex-col gap-12">
              <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed font-light">
                Generic website builders compress your master exports and clutter your cinematography with unnecessary, childish templates. 
                <strong> Foliohub</strong> delivers a flawless, ultra-minimal environment engineered specifically for handling massive, high-bitrate video portfolios, collaborative timelines, and dynamic client feedback loops.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#090909] border border-zinc-900 p-8 rounded-xl hover:border-zinc-800 transition-colors">
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-indigo-400 block mb-4">Core Philosophy</span>
                  <h3 className="text-xl font-bold uppercase mb-3">Absolute Fidelity</h3>
                  <p className="text-zinc-500 text-sm font-light leading-relaxed">
                    Edge-delivered 4K streaming pipeline ensures high-fidelity playback. What you see in your NLE timeline is exactly what your clients and directors view. No ugly artifacts, no lossy compression.
                  </p>
                </div>
                <div className="bg-[#090909] border border-zinc-900 p-8 rounded-xl hover:border-zinc-800 transition-colors">
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-indigo-400 block mb-4">Upload Pipeline</span>
                  <h3 className="text-xl font-bold uppercase mb-3">Instant Ingestion</h3>
                  <p className="text-zinc-500 text-sm font-light leading-relaxed">
                    Drop ProRes files directly into your studio dashboard. We handle background transcode optimization while keeping access to high-res source files available for authorized client downloads.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </motion.div>
      </div>

      {/* 
        SECTION 3: INTERACTIVE FEATURES SHOWCASE
        A curated suite of modern visuals mapping real app functionalities.
      */}
      <div className="min-h-screen bg-[#070707] py-32 border-t border-zinc-900 relative">
        <div className="max-w-[90rem] mx-auto px-6 sm:px-8 lg:px-12 xl:px-24">
          
          <div className="text-center mb-24">
             <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-4">Interactive System Demos</span>
             <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter">
                THE POWER IS IN THE <span className="font-serif italic font-light text-zinc-400">DETAILS.</span>
             </h2>
          </div>

          <div className="space-y-36">

            {/* FEATURE 1: Before/After Version Player */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6">
                  <Sliders className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-2">Dual-Version Comparison</span>
                <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  Before/After <br/>
                  <span className="font-serif italic font-light text-zinc-400">Grading Player.</span>
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed mb-6">
                  Allow directors to immediately perceive your visual color-grading style or VFX changes. Our interactive dual-view comparison allows side-by-side or sliding comparison of raw versus final graded footage.
                </p>
                <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span>Click & Drag Slider on the Right to Test</span>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div 
                  ref={sliderRef}
                  onMouseMove={(e) => isDraggingSlider && handleSliderMove(e.clientX)}
                  onMouseDown={() => setIsDraggingSlider(true)}
                  onMouseUp={() => setIsDraggingSlider(false)}
                  onMouseLeave={() => setIsDraggingSlider(false)}
                  onTouchMove={handleTouchMove}
                  onTouchStart={() => setIsDraggingSlider(true)}
                  onTouchEnd={() => setIsDraggingSlider(false)}
                  className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl cursor-ew-resize select-none"
                >
                  {/* Left Side: Before (RAW Log - Desaturated, low contrast) */}
                  <div className="absolute inset-0 z-0 bg-[#353535] filter grayscale brightness-125 contrast-75 overflow-hidden">
                    <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-60">
                      <source src="/editorial-opt.webm" type="video/webm" />
                      <source src="/editorial-opt.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 border border-white/10 text-zinc-400">
                      RAW SL-LOG3
                    </div>
                  </div>

                  {/* Right Side: After (Graded - Full color, cinematic contrast) */}
                  <div 
                    className="absolute inset-y-0 right-0 z-10 overflow-hidden bg-black"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div 
                      className="absolute inset-y-0 right-0 w-[100vw] h-full object-cover"
                      style={{ width: sliderRef.current ? `${sliderRef.current.getBoundingClientRect().width}px` : '100%' }}
                    >
                      <video autoPlay loop muted playsInline className="w-full h-full object-cover filter contrast-[1.1] saturate-[1.1]">
                        <source src="/editorial-opt.webm" type="video/webm" />
                        <source src="/editorial-opt.mp4" type="video/mp4" />
                      </video>
                      <div className="absolute bottom-4 right-4 bg-white text-black text-[9px] font-bold font-mono uppercase tracking-widest px-2.5 py-1">
                        GRADED (Auteur LUT)
                      </div>
                    </div>
                  </div>

                  {/* Vertical Drag Handle Line */}
                  <div 
                    className="absolute inset-y-0 w-0.5 bg-white z-20 shadow-lg cursor-ew-resize"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-2xl">
                      <Sliders className="w-3.5 h-3.5 text-black" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FEATURE 2: Production Story Workflow */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="bg-[#090909] border border-zinc-900 p-6 sm:p-8 rounded-xl shadow-xl flex flex-col gap-6">
                  
                  {/* Stages Timeline Selector */}
                  <div className="flex gap-2 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar">
                    {Object.keys(storyStages).map((stage) => (
                      <button
                        key={stage}
                        onClick={() => setActiveStoryStage(stage as any)}
                        className={`px-4 py-2 text-[10px] uppercase font-mono tracking-widest rounded-lg transition-all whitespace-nowrap ${
                          activeStoryStage === stage 
                            ? 'bg-white text-black font-bold' 
                            : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>

                  {/* Active Stage Display Panel */}
                  <div className="min-h-[160px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xl font-bold uppercase tracking-tight text-white mb-2">
                        {storyStages[activeStoryStage].title}
                      </h4>
                      <p className="text-zinc-400 text-sm font-light leading-relaxed mb-4">
                        {storyStages[activeStoryStage].desc}
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-900 rounded px-4 py-3 font-mono text-[10px] text-zinc-500 flex flex-col gap-1">
                      <span className="text-indigo-400 font-bold block mb-1">Auteur Studio Log:</span>
                      <span>&gt; {storyStages[activeStoryStage].notes}</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-2">Interactive Workflow Timeline</span>
                <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  Transparent <br/>
                  <span className="font-serif italic font-light text-zinc-400">Production Stories.</span>
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed">
                  Every video is a result of meticulous phases. Show off your entire process transparently. Display structured updates on **Brief**, **Storyboard**, **Rough Cut**, **Revisions**, and **Final Export** directly on your project portfolio card. Build massive trust with high-tier clients instantly.
                </p>
              </div>
            </div>

            {/* FEATURE 3: Collaborative Review System */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-2">Frame-Accurate Collaboration</span>
                <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  Collaborative <br/>
                  <span className="font-serif italic font-light text-zinc-400">Client Reviews.</span>
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed">
                  Don't lose time in translations. Our frame-accurate review system allows directors, agencies, and producers to leave localized feedback, markers, or raw annotations directly on specific video timestamps.
                </p>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-[#090909] border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
                  {/* Simulated Video Player */}
                  <div className="relative aspect-video w-full bg-black flex items-center justify-center border-b border-zinc-900 group">
                    <video autoPlay loop play-inline="true" muted className="w-full h-full object-cover opacity-60">
                      <source src="/hover-opt.webm" type="video/webm" />
                      <source src="/hover-opt.mp4" type="video/mp4" />
                    </video>
                    
                    {/* Simulated Marker Dots on Timeline */}
                    <div className="absolute bottom-12 inset-x-4 h-1 bg-zinc-800 rounded-full flex items-center justify-start pointer-events-auto">
                      <div className="h-full bg-white w-1/3 rounded-full relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-black shadow"></div>
                      </div>
                      
                      {/* Timeline Markers */}
                      <button onClick={() => setSelectedCommentId(1)} className="absolute left-[15%] w-2 h-2 rounded-full bg-amber-500 hover:scale-125 transition-transform" title="Sarah's Comment"></button>
                      <button onClick={() => setSelectedCommentId(2)} className="absolute left-[35%] w-2 h-2 rounded-full bg-indigo-500 hover:scale-125 transition-transform" title="Devin's Comment"></button>
                      <button onClick={() => setSelectedCommentId(3)} className="absolute left-[50%] w-2 h-2 rounded-full bg-emerald-500 hover:scale-125 transition-transform" title="Sarah's Approval"></button>
                    </div>

                    <div className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 bg-black/60 px-2 py-0.5 rounded">
                      Client Review mode active
                    </div>
                  </div>

                  {/* Comment Details Area */}
                  <div className="p-6 bg-zinc-950 flex flex-col gap-4">
                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-600 block">Click timeline dots above to navigate feedback</span>
                    
                    {mockComments.map((comment) => (
                      <div 
                        key={comment.id}
                        onClick={() => setSelectedCommentId(comment.id)}
                        className={`p-3 rounded-lg border-l-2 bg-[#090909] cursor-pointer transition-colors ${
                          selectedCommentId === comment.id 
                            ? `${comment.color} bg-white/5` 
                            : 'border-zinc-800 hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-[10px] font-mono">
                          <span className="font-bold text-zinc-300">{comment.author}</span>
                          <span className="text-zinc-600">Frame {comment.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-400 font-light">{comment.text}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>

            {/* FEATURE 4: AI Matchmaker Demo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="bg-[#090909] border border-zinc-900 rounded-xl p-8 shadow-xl flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Live AI Matching Simulator</span>
                  </div>

                  <div className="flex flex-col gap-2">
                     <p className="text-xs text-zinc-400 font-mono">Select a quick production vibe to test matching logic:</p>
                     <div className="flex flex-wrap gap-2">
                        <button onClick={() => triggerAiMatchDemo("Cyberpunk Neon Thriller")} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono uppercase tracking-widest hover:border-zinc-500 text-zinc-400">Cyberpunk Neon Thriller</button>
                        <button onClick={() => triggerAiMatchDemo("Fast Retro VHS Edit")} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono uppercase tracking-widest hover:border-zinc-500 text-zinc-400">Fast Retro VHS Edit</button>
                        <button onClick={() => triggerAiMatchDemo("Moody Cinematic Commercial")} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono uppercase tracking-widest hover:border-zinc-500 text-zinc-400">Moody Cinematic Commercial</button>
                     </div>
                  </div>

                  <div className="bg-black border border-zinc-800 rounded px-6 py-4 flex flex-col items-center justify-center min-h-[140px] text-center font-mono">
                    {isAiScanning ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">Running heatmaps & visual parsing...</span>
                      </div>
                    ) : aiMatchScore ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
                         <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">&gt; Match Found!</span>
                         <span className="text-xl font-bold uppercase tracking-tight text-white">{aiMatchedEditor}</span>
                         <span className="text-zinc-500 text-[10px] uppercase">AI Confidence Score: {aiMatchScore}% Match</span>
                         <Link href="/match" className="mt-2 text-[9px] uppercase tracking-widest text-indigo-400 hover:underline flex items-center gap-1 font-bold">
                           Run full query in AI portal <ChevronRight className="w-3 h-3" />
                         </Link>
                      </motion.div>
                    ) : (
                      <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Awaiting query input simulation</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-2">Editor Heatmap Discovery</span>
                <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  A.I. Creator <br/>
                  <span className="font-serif italic font-light text-zinc-400">Matchmaker.</span>
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed mb-6">
                  Skip the long talent directories. Our AI Matchmaker parses candidates based on color heatmaps, editing speeds, and detailed project metadata. Just describe the visual mood, pacing, and style you need, and meet your match.
                </p>
                <Link href="/match" className="text-xs font-mono uppercase tracking-widest text-white hover:underline flex items-center gap-2">
                  Go to Matchmaker Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* FEATURE 5: Style/Aesthetic Fingerprint */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6">
                  <Aperture className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 block mb-2">Cinematographic Profile</span>
                <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-6">
                  Aesthetic <br/>
                  <span className="font-serif italic font-light text-zinc-400">Style Fingerprint.</span>
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed">
                  We generate an aesthetic "DNA fingerprint" for every creator's studio. We analyze your uploaded video colors, pacing speed, and composition settings to generate a premium visual spectrum, showcasing your unique artistic fingerprint to potential directors.
                </p>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-[#090909] border border-zinc-900 rounded-xl p-8 shadow-xl flex flex-col gap-6">
                   <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Style DNA Analysis Vector</span>
                   
                   <div className="space-y-4 font-mono text-[10px]">
                      {/* Pacing Speed Indicator */}
                      <div className="space-y-1">
                         <div className="flex justify-between text-zinc-400">
                            <span>Dynamic Pacing Vector (Cut Speed)</span>
                            <span className="text-white">Fast Assembly</span>
                         </div>
                         <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full" />
                         </div>
                      </div>

                      {/* Color grading spectrum */}
                      <div className="space-y-1">
                         <div className="flex justify-between text-zinc-400">
                            <span>Aesthetic Palette (Color Temperature)</span>
                            <span className="text-white">Moody Teal & Orange</span>
                         </div>
                         <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: "88%" }} transition={{ duration: 1.5, delay: 0.7 }} className="h-full bg-gradient-to-r from-cyan-500 via-zinc-900 to-amber-500 rounded-full" />
                         </div>
                      </div>

                      {/* Contrast & Grading */}
                      <div className="space-y-1">
                         <div className="flex justify-between text-zinc-400">
                            <span>Visual Contrast DNA (Shadow Ratio)</span>
                            <span className="text-white">Chiaroscuro (High Contrast)</span>
                         </div>
                         <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: "65%" }} transition={{ duration: 1.5, delay: 0.9 }} className="h-full bg-gradient-to-r from-zinc-950 to-zinc-200 rounded-full" />
                         </div>
                      </div>
                   </div>

                   {/* Abstract spectrum block */}
                   <div className="h-12 w-full bg-gradient-to-r from-cyan-900 via-indigo-950 to-amber-950 rounded border border-zinc-900 flex items-center justify-between px-6 font-mono text-[9px] text-zinc-500 tracking-widest uppercase">
                      <span>Teal Matrix</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Warm Highs</span>
                   </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 
        SECTION 4: IMMERSIVE HORIZONTAL / GALLERY MOCKUP
      */}
      <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col justify-center px-6 sm:px-8 lg:px-24 py-20 relative overflow-hidden border-t border-zinc-900/50">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-10 gap-8">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none max-w-2xl">
            A PLATFORM <br />
            <span className="font-serif italic font-light text-zinc-400">MADE FOR AUTEURS.</span>
          </h2>
          <Link href="/signup">
            <button className="flex items-center gap-3 group">
              <span className="text-sm sm:text-base font-bold uppercase tracking-widest border-b border-white pb-1">Claim your studio</span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </button>
          </Link>
        </div>

        {/* Abstract structural grid - sized elegantly to match upper components */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:h-[28vh] min-h-[220px] items-stretch">
          <div className="rounded-none border border-zinc-900 bg-[#090909]/60 p-5 sm:p-6 flex flex-col justify-between gap-6 backdrop-blur-sm">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Custom Domains</span>
            <p className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug">yourname.com <br/> connected in 10s.</p>
          </div>
          <div className="sm:col-span-2 relative overflow-hidden group aspect-video sm:aspect-auto border border-zinc-900 bg-[#090909]/60">
             <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                preload="metadata"
                className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 opacity-80 group-hover:opacity-100"
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
                disablePictureInPicture
              >
                <source src="/hover-focus.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition duration-500">
                 <span className="text-white font-bold tracking-[0.3em] uppercase mix-blend-overlay text-sm sm:text-base">Aesthetic Hover Focus</span>
              </div>
          </div>
          <div className="rounded-none border border-zinc-900 bg-[#090909]/60 text-white p-5 sm:p-6 flex flex-col justify-between gap-6 backdrop-blur-sm">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Analytics</span>
            <p className="text-lg sm:text-2xl font-serif italic text-white tracking-tight leading-snug">Know who's watching.</p>
          </div>
        </div>

        {/* Sleek Avant-Garde Developer Credit Footer */}
        <div className="mt-24 pt-12 border-t border-zinc-900/60 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs sm:text-sm text-zinc-400 font-mono tracking-[0.18em] uppercase">
          <div className="text-center sm:text-left leading-relaxed">
            FOLIOHUB © 2026. FOR THE HIGH-BITRATE CREATIVES.
          </div>
          <div className="flex items-center gap-2.5">
            <span className="opacity-70">ENGINEERED BY</span>
            <a 
              href="https://sofycode.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-400 hover:text-white font-bold tracking-[0.22em] transition-colors duration-300 flex items-center gap-1.5 group"
            >
              SOFYCODE 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </div>

    </main>
  );
}
