// src/app/page.tsx
'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Play, ArrowRight, Aperture, MousePointer2 } from 'lucide-react';
import FolioLogo from '@/components/FolioLogo';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Hero Video scaling & fading on scroll
  const videoScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.2]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [0, 300]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  // Features Section (Sticky scroll)
  const featuresOpacity = useTransform(scrollYProgress, [0.15, 0.25], [0, 1]);
  const featuresY = useTransform(scrollYProgress, [0.2, 0.3], [100, 0]);
  
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

  return (
    <main ref={containerRef} className="bg-[#050505] text-white selection:bg-white selection:text-black">
      
      {/* Custom Cursor (Visible only on Hero) */}
      <AnimatePresence>
        {isHoveringHero && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-0 left-0 w-24 h-24 bg-white text-black rounded-full flex items-center justify-center font-bold tracking-widest text-[10px] uppercase z-[100] pointer-events-none mix-blend-difference"
            style={{ 
              x: mousePosition.x - 48, 
              y: mousePosition.y - 48,
              transition: 'transform 0.1s ease-out'
            }}
          >
            Play Reel
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
          <Link href="/login" className="text-xs uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Login</Link>
          <Link href="/signup" className="text-xs uppercase tracking-[0.2em] relative overflow-hidden group">
            <span className="block group-hover:-translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]">Studio Setup</span>
            <span className="block absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]">Studio Setup</span>
          </Link>
        </div>
        <div className="flex sm:hidden gap-4 pointer-events-auto items-center">
           <Link href="/login" className="text-[10px] uppercase tracking-[0.2em]">Login</Link>
           <Link href="/signup" className="text-[10px] uppercase tracking-[0.2em] font-bold">Studio</Link>
        </div>
      </nav>

      {/* 
        SECTION 1: MASSIVE CINEMATIC HERO 
        This is not a generic SaaS box. It's a full-bleed film experience.
      */}
      <div 
        className="h-[200vh] relative w-full"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        <div className="sticky top-0 w-full h-screen overflow-hidden">
          <div className="w-full h-full relative bg-black" key="hero-video-lite">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              preload="metadata"
              className="w-full h-full object-cover relative z-0"
              src="https://sofycode-portfolio-assets.s3.eu-north-1.amazonaws.com/3deba717-58ec-4c8e-8463-2c21b8f57c27.mp4" 
            />
            {/* Simple Overlay */}
            <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none" />
          </div>


          <motion.div 
            style={{ y: titleY, opacity: titleOpacity }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none px-6"
          >
            <h1 className="text-[14vw] sm:text-[10vw] font-bold tracking-tighter leading-[0.8] mb-6 uppercase flex flex-col">
              <span className="overflow-hidden"><motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="block">The Director's</motion.span></span>
              <span className="overflow-hidden font-serif italic text-zinc-400"><motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} className="block">Showcase.</motion.span></span>
            </h1>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 1, duration: 2 }}
              className="mt-8 sm:mt-12 flex flex-col items-center gap-4"
            >
              <MousePointer2 className="w-5 h-5 opacity-50 animate-bounce hidden sm:block" />
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-50 font-mono">Scroll to Discover</p>
            </motion.div>
          </motion.div>
        </div>
      </div>


      {/* 
        SECTION 2: EDITORIAL SCROLL (A24 / APPLE VIBES)
      */}
      <div className="min-h-screen relative w-full bg-[#050505] z-30 -mt-10 px-6 sm:px-8 lg:px-24">
        <motion.div style={{ opacity: featuresOpacity, y: featuresY }} className="py-24 sm:py-32">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/5] bg-zinc-900 overflow-hidden relative group">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  preload="metadata"
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000 ease-in-out"
                  src="https://sofycode-portfolio-assets.s3.eu-north-1.amazonaws.com/40f15231-34e4-40d2-915a-165efd8c0fce.mp4" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 sm:p-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em]">01 / Flawless Streaming</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex flex-col justify-center">
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter mb-6 lg:mb-8 leading-tight">
                No templates.<br />
                <span className="font-serif italic text-zinc-500">No noise.</span><br />
                Just your work.
              </h2>
              <p className="text-base sm:text-lg text-zinc-400 max-w-md leading-relaxed mb-8 sm:mb-12 font-light">
                Generic website builders compress your files and clutter your art with unnecessary UI. 
                Folio Hub provides a pristine, ultra-minimal environment engineered specifically for handling massive, uncompressed high-bitrate video portfolios.
              </p>

              <div className="space-y-6 sm:space-y-8">
                <div className="border-t border-zinc-800 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <Aperture className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                    <h3 className="uppercase tracking-[0.15em] text-[11px] sm:text-sm font-bold">Uncompressed Playback</h3>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-500 font-light pl-8 sm:pl-9">Edge-delivered 4K streaming ensures the client sees exactly what you edited.</p>
                </div>
                <div className="border-t border-zinc-800 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 fill-current" />
                    <h3 className="uppercase tracking-[0.15em] text-[11px] sm:text-sm font-bold">Instant Uploads</h3>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-500 font-light pl-8 sm:pl-9">Drop gigabytes of ProRes into the browser. We handle the rest instantly.</p>
                </div>
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* 
        SECTION 3: IMMERSIVE HORIZONTAL / GALLERY MOCKUP
      */}
      <div className="min-h-screen w-full bg-white text-black flex flex-col justify-center px-6 sm:px-8 lg:px-24 py-16 sm:py-20 overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-12 sm:mb-16 gap-8">
          <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter leading-none max-w-2xl">
            A PLATFORM <br />
            <span className="font-serif italic font-light text-zinc-400">MADE FOR AUTEURS.</span>
          </h2>
          <Link href="/signup">
            <button className="flex items-center gap-4 group">
              <span className="text-lg sm:text-xl font-bold uppercase tracking-widest border-b-2 border-black pb-1">Claim your studio</span>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-300">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </button>
          </Link>
        </div>

        {/* Abstract structural grid instead of generic bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:h-[40vh] items-stretch">
          <div className="rounded-none border border-black/10 bg-zinc-100 p-6 sm:p-8 flex flex-col justify-between gap-8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Custom Domains</span>
            <p className="text-2xl sm:text-3xl font-bold">yourname.com <br/> connected in 10s.</p>
          </div>
          <div className="sm:col-span-2 relative overflow-hidden group aspect-video sm:aspect-auto">
             <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                preload="metadata"
                className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700"
                src="https://sofycode-portfolio-assets.s3.eu-north-1.amazonaws.com/7ab96903-dbcf-4d86-9dc8-08744fe7db98.mp4" 
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition duration-500">
                 <span className="text-white font-bold tracking-[0.3em] uppercase mix-blend-overlay text-lg sm:text-xl">Hover Focus</span>
              </div>
          </div>
          <div className="rounded-none border border-black/10 bg-black text-white p-6 sm:p-8 flex flex-col justify-between gap-8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Analytics</span>
            <p className="text-2xl sm:text-3xl font-bold font-serif italic">Know who's watching.</p>
          </div>
        </div>
      </div>

    </main>
  );
}