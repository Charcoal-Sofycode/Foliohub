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
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const router = useRouter();

  // STEP 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/signup/request-otp', { email });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification code failed to send.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3 (Final): Verify OTP and Create Password
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!isAgreed) {
      setError("You must acknowledge the Privacy Policy to proceed.");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      await api.post('/signup', {
        email,
        password,
        otp_code: otp
      });

      // Auto-login after success
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('token', loginRes.data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Account creation failed. Code might have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row-reverse selection:bg-white selection:text-black font-sans">
      
      {/* Right side: Cinematic visual */}
      <div className="hidden md:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <video 
            autoPlay loop muted playsInline 
            className="w-full h-full object-cover filter contrast-125 saturate-50 grayscale select-none pointer-events-none"
            src="https://sofycode-portfolio-assets.s3.eu-north-1.amazonaws.com/72de9afc-1b3c-4b2b-8efd-7a1fcb63d489.mp4" 
          />
        </div>

        <div className="relative z-50">
           <FolioLogo iconSize={24} />
        </div>

        <div className="relative z-20 text-right">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
        
        <div className="md:hidden absolute top-10 left-10 z-50">
           <FolioLogo iconSize={24} />
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {step === 'email' && "Studio Registration"}
              {step === 'otp' && "Verify Your Identity"}
              {step === 'password' && "Set Security Key"}
            </h2>
            <p className="text-zinc-500 text-sm">
              {step === 'email' && "Only verified industry professionals can establish a studio."}
              {step === 'otp' && `We've dispatched a security code to ${email}`}
              {step === 'password' && "Create a secure key to protect your cinematic assets."}
            </p>
          </div>

          <form onSubmit={step === 'password' ? handleSignup : (step === 'email' ? handleRequestOTP : (e) => { e.preventDefault(); setStep('password'); })} className="space-y-6">
            
            {step === 'email' && (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Professional Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light"
                  placeholder="director@studio.com"
                />
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Verification Code</label>
                <input 
                  type="text" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))}
                  required
                  maxLength={6}
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-2xl outline-none transition-colors placeholder-zinc-700 tracking-[0.5em] font-mono text-center"
                  placeholder="000000"
                />
              </div>
            )}

            {step === 'password' && (
              <>
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
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 bottom-3 text-zinc-600 hover:text-white transition-colors">
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
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-4">
                   <div className="relative flex items-center h-5">
                      <input 
                        type="checkbox" 
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-800 bg-black text-white focus:ring-0 focus:ring-offset-0 transition cursor-pointer" 
                      />
                   </div>
                   <label className="text-[10px] text-zinc-500 font-light leading-relaxed">
                      I acknowledge the <span className="text-white hover:underline cursor-pointer">Privacy Policy</span> and agree that my uploaded media will be processed via secure AWS S3 environments.
                   </label>
                </div>
              </>
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
                {isLoading ? 'Processing...' : (step === 'password' ? 'Establish Studio' : 'Continue')}
              </span>
              <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </div>
            </button>
            
          </form>

          <div className="mt-16 pt-8 border-t border-zinc-900 flex justify-between items-center text-sm font-medium text-zinc-500">
            {step === 'email' ? (
              <Link href="/login" className="flex items-center gap-2 hover:text-white transition group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest text-xs border-b border-zinc-800 pb-1 group-hover:border-white">Back to Access</span>
              </Link>
            ) : (
              <button 
                onClick={() => setStep(step === 'password' ? 'otp' : 'email')}
                className="flex items-center gap-2 hover:text-white transition group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest text-xs border-b border-zinc-800 pb-1 group-hover:border-white">Previous Step</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
