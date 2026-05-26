'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Server, Globe, Trash2, X, ArrowRight, CheckCircle2, Lock, Video } from 'lucide-react';

interface PrivacyVisualizerProps {
  onAccept: () => void;
  onClose: () => void;
}

export default function PrivacyVisualizer({ onAccept, onClose }: PrivacyVisualizerProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      id: 'identity',
      title: 'Identity & Security',
      description: 'Your studio login is locked down. We salt and hash your credentials instantly.',
      icon: <Shield className="w-16 h-16 text-emerald-400" />,
      visual: (
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <span className="text-white font-mono text-xs">@</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">Raw ID</span>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-600" />
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border border-dashed border-emerald-500/50 flex items-center justify-center bg-emerald-500/10"
          >
            <Lock className="w-6 h-6 text-emerald-400" />
          </motion.div>
          <ArrowRight className="w-5 h-5 text-zinc-600" />
          <div className="flex flex-col items-center">
             <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2 text-center">
              <span className="text-emerald-400 font-mono text-[8px] break-all">x8f$2...</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">Vault</span>
          </div>
        </div>
      )
    },
    {
      id: 'pipeline',
      title: 'Industrial Media Pipeline',
      description: 'Your raw 4K videos never touch public servers. They flow directly into secure, isolated AWS S3 buckets before processing.',
      icon: <Server className="w-16 h-16 text-blue-400" />,
      visual: (
         <div className="flex flex-col items-center mt-8 space-y-4">
            <div className="flex items-center gap-4">
               <div className="flex items-center justify-center w-12 h-12 rounded bg-zinc-900 border border-zinc-800 text-white">
                  <Video className="w-5 h-5" />
               </div>
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: 80 }}
                 transition={{ duration: 1, repeat: Infinity }}
                 className="h-[2px] bg-blue-500 overflow-hidden relative"
               >
                 <div className="absolute inset-0 bg-white/50 w-4 blur-sm -translate-x-4 animate-[shimmer_1s_infinite]" />
               </motion.div>
               <div className="flex items-center justify-center w-16 h-16 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <Server className="w-6 h-6" />
               </div>
            </div>
            <div className="flex gap-2 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
               <span>Direct Upload</span>
               <span>&bull;</span>
               <span>FFmpeg</span>
               <span>&bull;</span>
               <span className="text-blue-400">AWS S3</span>
            </div>
         </div>
      )
    },
    {
      id: 'exposure',
      title: 'Public Portfolio Exposure',
      description: 'By default, your optimized cinematic reels and metadata are public to attract high-ticket clients to your custom domain.',
      icon: <Globe className="w-16 h-16 text-purple-400" />,
      visual: (
         <div className="flex items-center justify-center mt-8">
            <div className="relative flex items-center justify-center w-32 h-32 rounded-full border border-zinc-800">
               <div className="absolute w-full h-full border border-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
               <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center z-10">
                  <Globe className="w-6 h-6 text-purple-400" />
               </div>
               {/* Orbits */}
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute w-32 h-32 rounded-full border border-dashed border-zinc-800"
               >
                  <div className="absolute -top-1.5 left-1/2 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1.5 left-1/2 w-3 h-3 bg-white rounded-full" />
               </motion.div>
            </div>
         </div>
      )
    },
    {
      id: 'deletion',
      title: 'Total Data Autonomy (GDPR)',
      description: 'You own your data. Trigger the Destruction Protocol at any time to instantly wipe your assets, history, and account from existence. No backups retained.',
      icon: <Trash2 className="w-16 h-16 text-red-500" />,
      visual: (
         <div className="flex items-center justify-center mt-8 gap-8">
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 border border-zinc-800 bg-zinc-900 rounded flex items-center justify-center">
                  <span className="text-xs font-mono text-zinc-500">USER_DATA</span>
               </div>
            </div>
            <motion.div 
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: [1, 1.2, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="flex items-center justify-center w-16 h-16"
            >
               <Trash2 className="w-8 h-8 text-red-500" />
            </motion.div>
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 border border-dashed border-zinc-800 bg-transparent rounded flex items-center justify-center">
                  <span className="text-xs font-mono text-zinc-700">VOID</span>
               </div>
            </div>
         </div>
      )
    }
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setStep(prev => prev + 1);
    }
  };

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#050505] border border-zinc-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl shadow-black"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8 mt-2">
           {steps.map((s, i) => (
             <div 
               key={s.id} 
               className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : i < step ? 'w-4 bg-zinc-600' : 'w-4 bg-zinc-900'}`} 
             />
           ))}
        </div>

        <div className="min-h-[300px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="flex justify-center mb-6">
                {currentStep.icon}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-4">
                {currentStep.title}
              </h2>
              <p className="text-zinc-400 font-light max-w-lg mx-auto leading-relaxed text-sm">
                {currentStep.description}
              </p>
              
              <div className="mt-8 bg-black/50 rounded-xl p-6 border border-zinc-900">
                 {currentStep.visual}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-end gap-4 border-t border-zinc-900 pt-6">
          {!isLastStep ? (
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-4 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors rounded-sm"
            >
              Understand & Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleAccept}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              <CheckCircle2 className="w-4 h-4" /> I Accept Privacy & Data Terms
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
