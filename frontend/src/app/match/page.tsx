'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, CheckCircle2, Video, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import FolioLogo from '@/components/FolioLogo';
import api from '@/lib/api';

export default function AIMatchPage() {
  const [query, setQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsScanning(true);
    setResults(null);

    // Artificial delay to show off the scanning animation
    await new Promise(r => setTimeout(r, 2500));

    try {
      const res = await api.post('/ai/match', { reference_text: query });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      // Fallback empty
      setResults([]);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-white selection:text-black">
      {/* Navbar Minimal */}
      <nav className="fixed top-0 inset-x-0 w-full z-50 p-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <FolioLogo />
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 lg:px-12 max-w-5xl mx-auto min-h-screen flex flex-col justify-center">
        
        {!results && !isScanning && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto w-full text-center">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-8">
              <Sparkles className="w-3 h-3 text-white" /> AI Editor Matching
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
              Find Your <br/> <span className="text-zinc-500 italic font-serif font-light">Perfect Cut.</span>
            </h1>
            
            <p className="text-zinc-400 text-lg md:text-xl font-light mb-12 max-w-xl mx-auto">
              Describe the vibe, pacing, or style you need. Our AI analyzes editor heatmaps and backend metadata to find your exact match.
            </p>

            <form onSubmit={handleMatch} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-black border border-zinc-800 rounded-full p-2 pl-6 flex items-center shadow-2xl">
                <Search className="w-6 h-6 text-zinc-500 mr-4 flex-shrink-0" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Fast-paced motion graphics for TikTok..."
                  className="bg-transparent border-none outline-none text-xl w-full text-white placeholder:text-zinc-700 font-light"
                />
                <button 
                  type="submit"
                  disabled={!query}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs ml-4 disabled:opacity-50 hover:scale-105 transition-transform shrink-0"
                >
                  Analyze
                </button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-xs font-mono uppercase tracking-widest text-zinc-600">
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Analyzes Heatmaps</span>
                <span className="flex items-center gap-2"><Video className="w-4 h-4" /> Reads Metadata</span>
              </div>
            </form>
          </motion.div>
        )}

        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#020202] flex flex-col items-center justify-center"
            >
              <div className="w-24 h-24 relative mb-12">
                <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-2 border-zinc-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Processing Request</h2>
              <div className="flex flex-col items-center gap-3 text-xs font-mono text-zinc-500 uppercase tracking-[0.2em]">
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>Scanning portfolio metadata...</motion.span>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>Calculating skill heatmaps...</motion.span>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>Ranking candidate capability...</motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {results && !isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Top Matches</h2>
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">For: "{query}"</p>
              </div>
              <button onClick={() => setResults(null)} className="px-6 py-2 border border-zinc-800 rounded-full text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition text-zinc-400">
                New Search
              </button>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-zinc-900 rounded-xl">
                <p className="text-zinc-500 font-mono uppercase tracking-widest">No editors match these precise criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {results.map((res, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.1 }}
                    key={res.portfolio.id}
                    className="bg-[#080808] border border-zinc-900 rounded-xl p-6 lg:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group hover:border-zinc-700 transition"
                  >
                    {/* Visual Match Score Ring */}
                    <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle className="text-zinc-900" strokeWidth="4" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64"/>
                        <motion.circle 
                          initial={{ strokeDasharray: "0 400" }}
                          animate={{ strokeDasharray: `${(res.match_score * 3.64)} 400` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="text-white" 
                          strokeWidth="4" 
                          strokeDasharray="400" 
                          strokeDashoffset="0"
                          strokeLinecap="round" 
                          stroke="currentColor" 
                          fill="transparent" 
                          r="58" cx="64" cy="64"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black">{res.match_score}%</span>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Match</span>
                      </div>
                    </div>

                    <div className="flex-1 w-full text-center md:text-left">
                      <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">{res.portfolio.title || res.portfolio.subdomain}</h3>
                      <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center justify-center md:justify-start gap-4">
                         <span className="flex items-center gap-1"><User className="w-3 h-3"/> @{res.portfolio.subdomain}</span>
                      </div>
                      
                      <div className="bg-zinc-900/50 rounded-lg p-4 mb-6 inline-block">
                        <p className="text-sm font-light text-zinc-300">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">AI Reasoning</span>
                          {res.match_reason}
                        </p>
                      </div>

                      {/* Mini Heatmap Preview */}
                      <div className="flex gap-6 max-w-sm mx-auto md:mx-0">
                         <div className="flex-1">
                            <span className="block text-[8px] font-mono uppercase tracking-widest text-zinc-600 mb-1">Cut Speed</span>
                            <div className="h-0.5 w-full bg-zinc-900"><div className="h-full bg-zinc-400" style={{width: `${res.portfolio.skill_cutting}%`}}></div></div>
                         </div>
                         <div className="flex-1">
                            <span className="block text-[8px] font-mono uppercase tracking-widest text-zinc-600 mb-1">Motion</span>
                            <div className="h-0.5 w-full bg-zinc-900"><div className="h-full bg-zinc-400" style={{width: `${res.portfolio.skill_motion}%`}}></div></div>
                         </div>
                         <div className="flex-1">
                            <span className="block text-[8px] font-mono uppercase tracking-widest text-zinc-600 mb-1">Color</span>
                            <div className="h-0.5 w-full bg-zinc-900"><div className="h-full bg-zinc-400" style={{width: `${res.portfolio.skill_color}%`}}></div></div>
                         </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto">
                       <Link href={`/p/${res.portfolio.subdomain}`} target="_blank">
                         <button className="w-full md:w-auto px-8 py-4 bg-white text-black text-xs font-bold font-mono uppercase tracking-widest rounded-full flex items-center justify-center gap-2 hover:bg-zinc-200 transition">
                            View Studio <ArrowRight className="w-4 h-4" />
                         </button>
                       </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </main>
    </div>
  );
}
