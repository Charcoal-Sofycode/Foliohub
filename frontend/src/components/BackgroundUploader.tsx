'use client';

import React from 'react';
import { useUpload } from '@/context/UploadContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

export default function BackgroundUploader() {
  const { activeUploads, clearUpload } = useUpload();

  if (activeUploads.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[500] flex flex-col gap-4 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {activeUploads.map((upload) => (
          <motion.div
            key={upload.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto bg-[#0a0a0a] border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {upload.status === 'uploading' && <div className="p-2 bg-white/5 rounded-lg"><UploadCloud className="w-4 h-4 text-white animate-pulse" /></div>}
                {upload.status === 'assembling' && <div className="p-2 bg-white/5 rounded-lg"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                {upload.status === 'completed' && <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>}
                {upload.status === 'failed' && <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle className="w-4 h-4 text-red-500" /></div>}
                
                <div>
                  <p className="text-[11px] font-bold text-white max-w-[180px] truncate uppercase tracking-widest">{upload.fileName}</p>
                  <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-tighter">
                    {upload.status === 'uploading' && `Transmitting Chunks • ${upload.progress}%`}
                    {upload.status === 'assembling' && `Finalizing Cinematic Master`}
                    {upload.status === 'completed' && `Upload Successful`}
                    {upload.status === 'failed' && `Network Error • Retry Required`}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => clearUpload(upload.id)}
                className="text-zinc-600 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            {upload.status !== 'completed' && upload.status !== 'failed' && (
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${upload.progress}%` }}
                />
              </div>
            )}
            
            {upload.status === 'failed' && (
              <p className="text-[9px] text-red-500 mt-2 font-medium">{upload.error}</p>
            )}
            
            {upload.status === 'completed' && (
              <p className="text-[9px] text-emerald-500 mt-2 font-medium">Media is now available for project creation.</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
