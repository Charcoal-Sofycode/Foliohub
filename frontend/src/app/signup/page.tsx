// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // 1. Create the user via our FastAPI
      await api.post('/signup', {
        email,
        password
      });

      // 2. We automatically log them in so they get a token instantly
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects 'username'
      formData.append('password', password);

      const loginRes = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      // 3. Store the token and push to dashboard
      localStorage.setItem('token', loginRes.data.access_token);
      router.push('/dashboard');
      
    } catch (err: any) {
      setIsLoading(false);
      setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row-reverse selection:bg-white selection:text-black font-sans">
      
      {/* Right side: Cinematic visual (Reversed for signup) */}
      <div className="hidden md:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover filter contrast-125 hover:grayscale-0 transition-all duration-[3000ms] ease-out grayscale select-none pointer-events-none"
            src="https://sofycode-portfolio-assets.s3.eu-north-1.amazonaws.com/72de9afc-1b3c-4b2b-8efd-7a1fcb63d489.mp4" 
          />
        </div>

        {/* Logo */}
        <div className="relative z-50">
           <FolioLogo iconSize={24} />
        </div>



        <div className="relative z-20 text-right">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4"
          >
            Claim Your<br/> 
            <span className="font-serif italic font-light text-zinc-400 normal-case lowercase leading-none block mt-2">personal studio.</span>
          </motion.h1>

          <div className="mt-12 flex flex-col items-end gap-3 text-sm text-zinc-400 font-mono uppercase tracking-widest text-xs">
             <div className="flex items-center gap-2">Unlimited 4K Uploads <CheckCircle2 className="w-4 h-4 text-white" /></div>
             <div className="flex items-center gap-2">Custom Domain <CheckCircle2 className="w-4 h-4 text-white" /></div>
             <div className="flex items-center gap-2">Zero Compression <CheckCircle2 className="w-4 h-4 text-white" /></div>
          </div>
        </div>
      </div>

      {/* Left side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-32 relative bg-[#050505]">
        
        {/* Mobile Logo */}
        <div className="md:hidden absolute top-10 left-10 z-50">
           <FolioLogo iconSize={24} />
        </div>
        <div className="md:hidden h-20" /> {/* Spacer */}

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Join the Elite</h2>
            <p className="text-zinc-500 text-sm">Create an account to start building your cinematic showreel.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            
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
              <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Security Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-3 text-zinc-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Confirm Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

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
                {isLoading ? 'Processing...' : 'Establish Studio'}
              </span>
              <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
            
          </form>

          <div className="mt-16 pt-8 border-t border-zinc-900 flex justify-between items-center text-sm font-medium text-zinc-500">
            <Link href="/login" className="flex items-center gap-2 hover:text-white transition group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="uppercase tracking-widest text-xs border-b border-zinc-800 pb-1 group-hover:border-white">Back to Access</span>
            </Link>
          </div>

        </motion.div>
      </div>

    </main>
  );
}
