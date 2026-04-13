'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import FolioLogo from '@/components/FolioLogo';
import { Search, MapPin, Briefcase } from 'lucide-react';

export default function DirectoryPage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/portfolios')
      .then(res => res.json())
      .then(data => {
        setPortfolios(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const filtered = portfolios.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.skills && p.skills.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      
      {/* Avant-Garde Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 mix-blend-difference px-8 lg:px-12 py-8 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
           <FolioLogo iconSize={24} className="text-xl" />
        </div>
        <div className="flex gap-8 pointer-events-auto items-center">
          <Link href="/login" className="text-sm uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Login</Link>
          <Link href="/dashboard" className="text-sm uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Dashboard</Link>
        </div>
      </nav>

      <section className="pt-40 px-8 lg:px-24">
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mb-20">
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
               Discover <br/>
               <span className="text-zinc-500 font-serif italic font-light">Creators.</span>
            </h1>
            <p className="text-xl text-zinc-400 font-light max-w-2xl">
               The global directory of elite video editors, colorists, and motion designers. Browse portfolios and hire directly.
            </p>
         </motion.div>

         {/* Search Filter */}
         <div className="relative max-w-2xl mb-16">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by skill (e.g. Color Grading) or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-5 pl-16 pr-8 text-white outline-none focus:border-white transition-colors"
            />
         </div>

         {/* Directory Grid */}
         {isLoading ? (
            <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Scanning Directory...</div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-32">
               {filtered.map(portfolio => (
                  <Link href={`/p/${portfolio.subdomain}`} key={portfolio.id}>
                     <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-[#0a0a0a] border border-zinc-900 hover:border-zinc-700 transition duration-300 p-8 flex flex-col h-full group"
                     >
                        <h3 className="text-2xl font-bold uppercase tracking-tight mb-2 group-hover:text-white transition">{portfolio.title}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase tracking-widest mb-6">
                           <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {portfolio.location || "Global"}</span>
                        </div>
                        
                        <p className="text-zinc-400 font-light text-sm line-clamp-3 mb-8 flex-1">
                           {portfolio.bio || "No biography provided."}
                        </p>

                        {portfolio.skills && (
                           <div className="flex flex-wrap gap-2 mt-auto border-t border-zinc-900 pt-6">
                              {portfolio.skills.split(',').slice(0, 3).map((skill: string, i: number) => (
                                 <span key={i} className="px-3 py-1 bg-zinc-900 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                    {skill.trim()}
                                 </span>
                              ))}
                              {portfolio.skills.split(',').length > 3 && (
                                <span className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                                   +{portfolio.skills.split(',').length - 3}
                                </span>
                              )}
                           </div>
                        )}
                        
                        <div className="mt-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white pb-0.5">View Studio</span>
                        </div>
                     </motion.div>
                  </Link>
               ))}
               
               {filtered.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-500 border border-dashed border-zinc-800">
                     No creators found matching your search.
                  </div>
               )}
            </div>
         )}
      </section>

    </main>
  );
}
