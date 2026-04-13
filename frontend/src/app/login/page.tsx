// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (is2FAStep) {
        // Handle 2FA verification
        const res = await api.post('/verify-2fa', { email, code: twoFactorCode });
        localStorage.setItem('token', res.data.access_token);
        router.push('/dashboard');
      } else {
        // Initial Login
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        if (res.data.requires_2fa) {
          setIs2FAStep(true);
          setIsLoading(false);
          return;
        }

        localStorage.setItem('token', res.data.access_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.response?.data?.detail || 'Invalid email or password');
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row selection:bg-white selection:text-black font-sans">
      
      {/* Left side: Cinematic visual */}
      <div className="hidden md:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10" />
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover filter contrast-125 saturate-50 grayscale select-none pointer-events-none"
            src="https://www.w3schools.com/html/mov_bbb.mp4" 
          />
        </div>

        {/* Content */}
        <div className="relative z-20 flex items-center gap-3">
          <FolioLogo iconSize={32} className="text-2xl" />
        </div>

        <div className="relative z-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4"
          >
            Welcome<br/> 
            <span className="font-serif italic font-light text-zinc-400 normal-case lowercase leading-none block mt-2">back to the studio.</span>
          </motion.h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-8 flex items-center gap-2 max-w-xs leading-relaxed">
            <span className="w-4 h-px bg-zinc-500" /> Authorized personnel only
          </p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-32 relative bg-[#050505]">
        
        {/* Mobile Header hidden on Desktop */}
        <div className="md:hidden absolute top-8 left-8 flex items-center gap-2">
          <FolioLogo iconSize={24} className="text-xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {is2FAStep ? 'Two-Factor Authentication' : 'Access Portal'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {is2FAStep ? 'Enter the security code sent to your device.' : 'Enter your credentials to manage your reel.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {!is2FAStep ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light"
                    placeholder="director@studio.com"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Security Key</label>
                    <Link href="/forgot-password" className="text-xs text-zinc-600 hover:text-white transition">Forgot?</Link>
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Security Code</label>
                <input 
                  type="text" 
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-2xl outline-none transition-colors placeholder-zinc-700 tracking-[0.5em] font-mono text-center"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-between py-4 group disabled:opacity-50 mt-8"
            >
              <span className="text-lg font-bold uppercase tracking-widest border-b-2 border-transparent group-hover:border-white transition-colors pb-1">
                {isLoading ? 'Verifying...' : 'Sign In'}
              </span>
              <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
            
          </form>

          <div className="mt-16 pt-8 border-t border-zinc-900 flex justify-between items-center text-sm font-medium text-zinc-500">
            <span>No account yet?</span>
            <Link href="/signup" className="text-white hover:opacity-70 transition-opacity uppercase tracking-widest text-xs border-b border-zinc-800 pb-1 hover:border-white">
              Create Studio
            </Link>
          </div>

        </motion.div>
      </div>

    </main>
  );
}