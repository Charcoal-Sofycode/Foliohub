'use client';

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import PortfolioPlayer from '@/components/PortfolioPlayer';
import BeforeAfterPlayer from '@/components/BeforeAfterPlayer';
import { MapPin, CalendarClock, Send, Play, Camera, CheckCircle2, Download } from 'lucide-react';
import FolioLogo from '@/components/FolioLogo';
import ProjectStoryTimeline from '@/components/ProjectStoryTimeline';
import StyleFingerprint from '@/components/StyleFingerprint';
import { API_URL } from '@/lib/api';

export default function PortfolioView({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch(`${API_URL}/portfolios/view/${resolvedParams.subdomain}`)
      .then(res => res.json())
      .then(data => {
        setPortfolio(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [resolvedParams.subdomain]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <p className="font-mono opacity-50 uppercase tracking-[0.3em] text-xs">Loading Studio...</p>
      </div>
    );
  }

  if (!portfolio || !portfolio.id) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono uppercase tracking-[0.3em] text-xs">
        Studio Not Found
      </div>
    );
  }

  const projects = portfolio.projects || [];
  const categories = ['All', ...Array.from(new Set(projects.map((p: any) => p.category || 'general'))).filter(c => c !== 'general')];
  
  const filteredProjects = activeCategory === 'All' 
    ? projects 
    : projects.filter((p: any) => p.category === activeCategory);

  const skillsList = portfolio.skills ? portfolio.skills.split(',').map((s: string) => s.trim()) : [];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black pb-32">
      
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 mix-blend-difference px-4 sm:px-6 lg:px-12 py-5 sm:py-8 flex justify-between items-center pointer-events-none">
         <div className="pointer-events-auto flex items-center gap-2 sm:gap-4 min-w-0">
           <FolioLogo iconSize={20} />
           <div className="w-px h-4 bg-white/20 hidden sm:block" />
           <h1 className="text-sm sm:text-lg font-bold tracking-tighter uppercase truncate max-w-[140px] sm:max-w-none hidden sm:block">{portfolio.title}</h1>
         </div>
         <div className="flex items-center gap-2 sm:gap-6 pointer-events-auto">
            {portfolio.booking_link && (
               <a href={portfolio.booking_link} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex px-4 sm:px-6 py-2 border border-white text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-white hover:text-black transition">
                 Book Now
               </a>
            )}
            <a href="#contact" className="px-4 sm:px-6 py-2 bg-white text-black text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-zinc-300 transition">
              Hire Me
            </a>
         </div>
      </nav>

      {/* Hero / Showreel */}
      <header className="h-[90vh] relative pt-24 sm:pt-32 px-4 sm:px-6 lg:px-12 flex flex-col justify-end pb-8 sm:pb-12">
         {portfolio.showreel_url ? (
            <div className="absolute inset-0 z-0">
               {/* Embed youtube or video. If it's a raw video url: */}
               {portfolio.showreel_url.endsWith('.mp4') || portfolio.showreel_url.endsWith('.webm') ? (
                  <video 
                     src={portfolio.showreel_url} 
                     autoPlay loop muted playsInline 
                     className="w-full h-full object-cover opacity-70" 
                     onContextMenu={(e) => e.preventDefault()}
                     controlsList="nodownload"
                     disablePictureInPicture
                  />
               ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <p className="text-zinc-600 font-mono text-xs uppercase tracking-widest">Showreel Connected: {portfolio.showreel_url}</p>
                  </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>
         ) : null}

         <div className="relative z-10 max-w-4xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-4 sm:mb-6"
            >
              {portfolio.title}
            </motion.h2>
            {portfolio.bio && (
               <motion.p 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                 className="text-base sm:text-lg md:text-2xl text-zinc-400 font-light max-w-2xl leading-relaxed"
               >
                 {portfolio.bio}
               </motion.p>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4 sm:gap-6 mt-6 sm:mt-8 border-t border-white/20 pt-4 sm:pt-6">
               {portfolio.location && (
                 <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-mono uppercase tracking-widest"><MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> {portfolio.location}</div>
               )}
               {portfolio.availability && (
                 <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-mono uppercase tracking-widest"><CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> {portfolio.availability}</div>
               )}
            </motion.div>
         </div>
      </header>

      {/* Skills & Heatmap */}
      {(skillsList.length > 0 || portfolio.skill_cutting) && (
         <div className="px-6 lg:px-12 py-16 flex flex-col lg:flex-row gap-16 border-y border-zinc-900 bg-[#0a0a0a]">
            
            {/* Tags */}
            <div className="flex-1">
               <h4 className="text-zinc-600 font-mono uppercase text-[10px] tracking-widest mb-6">Expertise Focus</h4>
               <div className="flex flex-wrap gap-4">
                  {skillsList.map((skill: string, i: number) => (
                     <span key={i} className="px-4 py-2 border border-zinc-800 rounded-full text-xs font-mono uppercase tracking-[0.2em] text-zinc-300">
                        {skill}
                     </span>
                  ))}
               </div>
            </div>

            {/* Heatmap */}
            <div className="flex-1 lg:max-w-md">
               <h4 className="text-zinc-600 font-mono uppercase text-[10px] tracking-widest mb-6 flex justify-between">
                 <span>Proficiency Matrix</span>
                 <span>Percentile</span>
               </h4>
               
               <div className="space-y-6">
                 <div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-white">
                      <span>Cutting Speed</span>
                      <span>{portfolio.skill_cutting || 50}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${portfolio.skill_cutting || 50}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-white relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white w-full blur-[2px]" />
                      </motion.div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-white">
                      <span>Motion Graphics</span>
                      <span>{portfolio.skill_motion || 50}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${portfolio.skill_motion || 50}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} className="h-full bg-white relative">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white w-full blur-[2px]" />
                      </motion.div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-white">
                      <span>Color Grading</span>
                      <span>{portfolio.skill_color || 50}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${portfolio.skill_color || 50}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }} className="h-full bg-white relative">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white w-full blur-[2px]" />
                      </motion.div>
                   </div>
                 </div>
               </div>
            </div>
         </div>
      )}

      {/* Style Fingerprint */}
      <StyleFingerprint 
        subdomain={resolvedParams.subdomain} 
        portfolioTitle={portfolio.title}
        fingerprintData={portfolio.style_fingerprint}
      />

      {/* Projects Gallery */}
      <section className="px-4 sm:px-6 lg:px-12 py-16 sm:py-24">
         <div className="flex flex-col md:flex-row justify-between items-end mb-12 sm:mb-16 gap-6 sm:gap-8">
            <h3 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter">Selected <br/><span className="text-zinc-500 italic font-serif font-light">Works.</span></h3>
            
            <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-4">
               {categories.map((cat: any) => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 sm:px-6 py-2 text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-white text-black' : 'border border-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    {cat}
                  </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            {filteredProjects.map((project: any, i: number) => (
               <motion.div 
                 initial={{ opacity: 0, y: 50 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: "-100px" }}
                 key={project.id} 
                 className="group"
               >
                  <div className="aspect-video bg-zinc-900 w-full mb-6 overflow-hidden relative">
                     {project.raw_media_url && project.media_url ? (
                        <BeforeAfterPlayer 
                           rawUrl={project.raw_media_url} 
                           finalUrl={project.media_url} 
                           title={project.title} 
                           thumbnailUrl={project.thumbnail_url}
                        />
                      ) : project.media_url ? (
                         <PortfolioPlayer 
                           url={project.media_url} 
                           title={project.title}
                           optimizedUrl={project.optimized_url}
                           thumbnailUrl={project.thumbnail_url}
                           transcodingStatus={project.transcoding_status}
                         />
                      ) : null}
                  </div>
                  <div>
                     <div className="flex justify-between items-start mb-2 gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                           <h4 className="text-2xl font-bold uppercase tracking-tight">{project.title}</h4>
                           {project.is_verified && (
                             <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[9px] uppercase tracking-widest font-bold">
                               <CheckCircle2 className="w-3 h-3" /> Verified Studio Edit
                             </span>
                           )}
                        </div>
                        <span className="px-3 py-1 bg-zinc-900 text-[10px] font-mono uppercase tracking-widest text-zinc-400 shrink-0">{project.category || 'Video'}</span>
                     </div>
                     <p className="text-zinc-500 font-light mb-4">{project.description}</p>
                     
                     <div className="space-y-4">
                        {(project.role || project.tools_used) && (
                           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-900 text-sm font-mono mt-4">
                              {project.role && (
                                <div>
                                   <p className="text-zinc-600 uppercase text-[10px] tracking-widest mb-1">Role</p>
                                   <p className="text-zinc-300">{project.role}</p>
                                </div>
                              )}
                              {project.tools_used && (
                                <div>
                                   <p className="text-zinc-600 uppercase text-[10px] tracking-widest mb-1">Tools</p>
                                   <p className="text-zinc-300">{project.tools_used}</p>
                                </div>
                              )}
                           </div>
                        )}

                        {project.timeline_breakdown && (
                           <div className="pt-4 border-t border-zinc-900">
                              <p className="text-zinc-600 font-mono uppercase text-[10px] tracking-widest mb-3">Proof of Work: Timeline Breakdown</p>
                              <div className="bg-[#050505] border border-zinc-800 p-4 font-mono text-[10px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                {project.timeline_breakdown}
                              </div>
                           </div>
                        )}

                        {project.project_file_url && (
                           <div className="pt-4 pb-2 border-zinc-900">
                              <a href={project.project_file_url} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-white hover:text-black transition text-[10px] font-bold uppercase tracking-widest text-zinc-300 rounded-sm">
                                <Download className="w-3.5 h-3.5" /> Download Project Proof
                              </a>
                           </div>
                        )}
                     </div>
                     {/* ── Project Story Timeline ── */}
                     <ProjectStoryTimeline
                        projectId={project.id}
                        projectTitle={project.title}
                        initialStory={project.story}
                        readOnly={true}
                     />
                  </div>
               </motion.div>
            ))}
         </div>
      </section>

      {/* Services & Rates */}
      {(portfolio.hourly_rate || portfolio.fixed_packages) && (
         <section className="px-6 lg:px-12 py-24 bg-[#080808] border-t border-zinc-900">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-16 items-start">
               <div className="flex-1">
                  <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">Investment.</h3>
                  <p className="text-zinc-400 font-light text-lg">Clear formatting. No hidden fees. These are the baseline starting rates for standard engagements.</p>
               </div>
               
               <div className="flex-[1.5] w-full grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {portfolio.hourly_rate && (
                     <div className="border border-zinc-800 bg-black p-8 rounded-xl flex flex-col justify-between">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-8">Hourly Engagement</div>
                        <div className="text-3xl font-black text-white">{portfolio.hourly_rate}</div>
                     </div>
                  )}
                  {portfolio.fixed_packages && (
                     <div className="border border-zinc-800 bg-black p-8 rounded-xl flex flex-col justify-between">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-8">Fixed / Monthly Retainer</div>
                        <div className="text-3xl font-black text-white">{portfolio.fixed_packages}</div>
                     </div>
                  )}
               </div>
            </div>
         </section>
      )}


      {/* Inquiry / Contact Section */}
      <section id="contact" className="px-4 sm:px-6 lg:px-12 py-24 sm:py-40 border-t border-zinc-900 bg-gradient-to-b from-[#050505] to-[#0a0a0a]">
         <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-20">
            <div className="flex-1">
               <h3 className="text-5xl font-black uppercase tracking-tighter mb-6">Start a <br/>Project.</h3>
               <p className="text-zinc-400 font-light text-lg mb-12">Currently accepting new bookings for {new Date().getFullYear()}. Fill out the form to discuss rates and availability.</p>
               
               <div className="flex items-center gap-6">
                  {portfolio.youtube_url && (
                    <a href={portfolio.youtube_url} target="_blank" className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition">
                      <Play className="w-5 h-5" />
                    </a>
                  )}
                  {portfolio.instagram_url && (
                    <a href={portfolio.instagram_url} target="_blank" className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition">
                      <Camera className="w-5 h-5" />
                    </a>
                  )}
               </div>
            </div>

            <div className="flex-1 bg-black p-8 lg:p-12 border border-zinc-900">
               <form 
                 className="flex flex-col gap-8" 
                 onSubmit={async (e) => { 
                   e.preventDefault();
                   const form = e.currentTarget;
                   const formData = new FormData(form);
                   const data = {
                     name: formData.get('name') as string,
                     email: formData.get('email') as string,
                     project_details: formData.get('details') as string
                   };

                   
                    try {
                      const res = await fetch(`${API_URL}/portfolios/${portfolio.id}/inquire`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                      });
                      
                      const result = await res.json();
                      
                      if (res.ok) {
                        alert("Proposition sent successfully! The creator will review and reach out.");
                        form.reset();
                      } else {
                        // Show the specific error from FastAPI (like 'at least 10 characters')
                        const errorMsg = result.detail?.[0]?.msg || result.detail || "Failed to send.";
                        alert(`Clearance Error: ${errorMsg}`);
                      }
                    } catch (err) {
                      alert("Network Error. Check your internet or backend status.");
                    }
                 }}
               >
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Your Name / Agency</label>
                    <input name="name" type="text" required className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-2 text-white outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Email Address</label>
                    <input name="email" type="email" required className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-2 text-white outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Project Details</label>
                    <textarea name="details" required className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-2 text-white outline-none transition-colors h-20 resize-none" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-[11px] hover:bg-zinc-200 transition flex justify-center items-center gap-3">
                     <Send className="w-4 h-4" /> Send Proposition
                  </button>
               </form>
            </div>

         </div>
      </section>

      {/* Powered By */}
      <div className="fixed bottom-6 right-6 mix-blend-difference pointer-events-none z-50">
         <div className="flex items-center gap-2 opacity-50 px-3 py-1.5 border border-white/20 rounded-full pointer-events-auto hover:opacity-100 transition cursor-pointer">
            <span className="text-[9px] uppercase tracking-widest font-mono">Powered By</span>
            <FolioLogo iconSize={12} className="text-xs" />
         </div>
      </div>
    </main>
  );
}
