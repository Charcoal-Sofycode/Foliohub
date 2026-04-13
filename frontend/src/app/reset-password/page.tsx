'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      await api.post('/reset-password', {
        email,
        token,
        new_password: newPassword
      });
      alert('Password successfully reset. You can now login.');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid token or email.');
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
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tighter mb-2">Execute Override</h2>
            <p className="text-zinc-500 text-sm">Enter the recovery token and establish a new secure key.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            
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
              <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Recovery Token</label>
              <input 
                type="text" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest text-zinc-500"
                placeholder="e9143a12-..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">New Key</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Confirm New Key</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors placeholder-zinc-700 font-light tracking-widest"
                placeholder="••••••••"
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
              className="w-full py-4 mt-6 bg-white text-black hover:bg-zinc-200 transition duration-300 font-bold uppercase tracking-widest text-sm rounded-sm flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Override'}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
