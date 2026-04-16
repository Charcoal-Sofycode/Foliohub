'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  iconSize?: number;
}

export default function FolioLogo({ className = "", iconSize = 24 }: LogoProps) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 outline-none ${className}`}>
      {/* Cinematic Icon Accent */}
      <div 
        className="relative flex items-center justify-center overflow-hidden rounded-[6px] bg-white transition-all duration-500 group-hover:bg-brand"
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
        <svg 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-[60%] h-[60%] text-black transition-colors duration-500 group-hover:text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 3l16 9-16 9V3z" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex items-center tracking-[-0.03em]">
        <span className="text-white font-black uppercase text-xl leading-none">
          Folio
        </span>
        <span className="text-zinc-500 font-light lowercase text-xl leading-none transition-colors duration-500 group-hover:text-white/70">
          hub
        </span>
      </div>
    </Link>
  );
}
