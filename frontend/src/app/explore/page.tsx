// src/app/explore/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, MapPin, ArrowUpRight, Filter, Target, Play } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

export default function ExplorePage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial load of all creators
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/portfolios');
        // Wrap regular results in a match structure for the UI
        setCreators(res.data.map((p: any) => ({ portfolio: p, match_score: null })));
      } catch (e) {
        console.error("Explore load error", e);
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchAll();
  }, []);

  const handleSmartMatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsMatching(true);
    try {
      const res = await api.post('/portfolios/match', { reference_text: searchTerm });
      setCreators(res.data);
    } catch (e) {
      console.error("Match error", e);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
         <Link href="/"><FolioLogo iconSize={20} /></Link>
         <div className="flex items-center gap-8">
            <Link href="/login" className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition">Sign In</Link>
            <Link href="/signup" className="px-5 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:scale-105 transition">Start Studio</Link>
         </div>
      </nav>

      {/* Hero / Heroic Search */}
      <section className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
         <div className="relative mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
               <div className="flex items-center gap-3 mb-6">
                  <span className="w-8 h-px bg-zinc-800" />
                  <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-mono">The Matchmaker Engine</span>
               </div>
               <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
                 Discovery is <br/> 
                 <span className="text-zinc-600 italic font-serif normal-case lowercase font-light">smarter</span> now.
               </h1>
               
               <p className="text-zinc-500 max-w-md text-sm md:text-base font-light leading-relaxed mb-12">
                 Don't search through thousands. Describe your project needs and let our semantic matching find the elite editor for your specific vision.
               </p>
            </motion.div>

            {/* Smart Search Bar */}
            <motion.form 
              onSubmit={handleSmartMatch}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative max-w-4xl"
            >
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-[#0a0a0a] border border-zinc-800 focus:border-white/40 rounded-2xl py-6 px-8 text-lg md:text-xl outline-none transition-all placeholder-zinc-700 font-light pr-40"
                 placeholder="I need a fast-paced YouTube editor for high-octane gaming..."
               />
               <button 
                 type="submit"
                 disabled={isMatching}
                 className="absolute right-3 top-3 bottom-3 px-8 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition active:scale-95 flex items-center gap-2"
               >
                 {isMatching ? (
                   <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <>Match <Target className="w-3.5 h-3.5" /></>
                 )}
               </button>
            </motion.form>
         </div>

         {/* Results Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-t border-zinc-900 pt-12">
            <div>
               <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
                  Showing {creators.length} {searchTerm ? 'Strategic Matches' : 'Elite Creators'}
               </h3>
            </div>
            <div className="flex flex-wrap gap-2">
               {['YouTube', 'Commercial', 'Social', 'Documentary', 'Colorist'].map(tag => (
                 <button 
                   key={tag}
                   onClick={() => { setSearchTerm(tag); handleSmartMatch(); }}
                   className="px-4 py-1.5 border border-zinc-900 rounded-full text-[10px] uppercase tracking-widest text-zinc-500 hover:border-white hover:text-white transition"
                 >
                   {tag}
                 </button>
               ))}
            </div>
         </div>

         {/* Creator Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence mode="popLayout">
               {isInitialLoad ? (
                 Array.from({ length: 6 }).map((_, i) => (
                   <div key={i} className="aspect-[4/5] bg-zinc-900/40 rounded-3xl animate-pulse" />
                 ))
               ) : creators.length > 0 ? (
                 creators.map((item, i) => (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, y: 30 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ delay: i * 0.05 }}
                     key={item.portfolio.id}
                     className="group"
                   >
                     <Link href={`/s/${item.portfolio.subdomain}`}>
                        <div className="relative aspect-[4/5] bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden group-hover:border-white/20 transition-all duration-500 flex flex-col p-8 group-hover:-translate-y-2">
                           
                           {/* Match Badge */}
                           {item.match_score && (
                             <div className="absolute top-6 left-6 z-20 px-3 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-1.5">
                                <Sparkles className="w-2.5 h-2.5" /> {item.match_score}% Match
                             </div>
                           )}

                           {/* Visual Preview (Mockup of best project) */}
                           <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 grayscale group-hover:grayscale-0">
                              {item.portfolio.projects?.[0]?.thumbnail_url ? (
                                <img src={item.portfolio.projects[0].thumbnail_url} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                           </div>

                           <div className="relative z-10 flex-1 flex flex-col justify-end">
                              <h4 className="text-4xl font-black tracking-tighter uppercase leading-none mb-1 group-hover:text-white transition-colors">{item.portfolio.title}</h4>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                 <MapPin className="w-3 h-3" /> {item.portfolio.location || 'Remote Specialist'}
                              </p>
                              
                              <div className="space-y-4">
                                 {/* Reasoning */}
                                 {item.match_reason && (
                                   <p className="text-[10px] text-zinc-400 font-medium italic border-l border-zinc-700 pl-3 py-1">
                                      {item.match_reason}
                                   </p>
                                 )}

                                 {/* Skills */}
                                 {item.portfolio.skills && (
                                   <div className="flex flex-wrap gap-2">
                                      {item.portfolio.skills.split(',').slice(0, 3).map((skill: string) => (
                                        <span key={skill} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] uppercase tracking-widest font-mono text-zinc-400">
                                           {skill.trim()}
                                        </span>
                                      ))}
                                      {(item.portfolio.skills.split(',').length > 3) && <span className="text-[9px] text-zinc-600 font-mono">+{item.portfolio.skills.split(',').length - 3}</span>}
                                   </div>
                                 )}

                                 <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                       <Play className="w-3 h-3 fill-current" /> Watch Showreel
                                    </span>
                                    <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Link>
                   </motion.div>
                 ))
               ) : (
                 <div className="col-span-full py-40 text-center">
                    <h3 className="text-xl font-bold mb-2">No creators match your vision.</h3>
                    <p className="text-zinc-500 text-sm">Try broadening your description or checking different keywords.</p>
                 </div>
               )}
            </AnimatePresence>
         </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 text-center">
         <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Powered by The FolioHub Matchmaker Engine</p>
      </footer>

    </main>
  );
}
