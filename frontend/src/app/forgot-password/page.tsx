'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center selection:bg-white selection:text-black font-sans relative overflow-hidden">
      
      {/* Background cinematic elements */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-white/5 blur-[150px] rounded-full pointer-events-none" />
      </div>

      <div className="w-full max-w-md px-8 relative z-10">
        <div className="flex justify-center mb-12">
          <FolioLogo iconSize={32} className="text-2xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-[#0a0a0a] border border-zinc-800/50 p-10 rounded-2xl shadow-2xl backdrop-blur-xl"
        >
          {!isSubmitted ? (
            <>
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black tracking-tighter mb-2">Recover Access</h2>
                <p className="text-zinc-500 text-sm">Enter your authorized email to receive a reset dispatch.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light text-center"
                    placeholder="director@studio.com"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center font-mono">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-white text-black hover:bg-zinc-200 transition duration-300 font-bold uppercase tracking-widest text-sm rounded-sm flex justify-center items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Dispatch'}
                </button>
              </form>
            </>
          ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-6"
             >
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Dispatch Sent</h2>
                <p className="text-zinc-400 text-sm mb-8">If {email} is on file, you will receive instructions shortly. Please check your spam folder.</p>
                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <Link href="/reset-password">
                    <button className="w-full px-6 py-3 border border-white bg-white text-black uppercase tracking-widest text-xs font-bold hover:bg-zinc-200 transition">
                       Execute Override
                    </button>
                  </Link>
                  <Link href="/login">
                    <button className="w-full px-6 py-3 border border-zinc-700 text-white uppercase tracking-widest text-xs font-bold hover:bg-zinc-800 transition">
                       Return to Access
                    </button>
                  </Link>
                </div>
             </motion.div>
          )}

          {!isSubmitted && (
            <div className="mt-8 pt-8 border-t border-zinc-900 flex justify-center items-center">
              <Link href="/login" className="flex items-center gap-2 text-zinc-500 hover:text-white transition group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest text-xs border-b border-zinc-800 pb-1 group-hover:border-white">Back to Portal</span>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
