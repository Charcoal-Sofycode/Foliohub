import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
}

export default function FolioLogo({ className = "", iconSize = 20 }: LogoProps) {
  return (
    <Link href="/" className={`inline-block ${className}`}>
      <span 
        className="font-display font-black text-white tracking-tighter"
        style={{ 
           fontSize: `${iconSize * 1.2}px`,
           textShadow: '1.5px 0 0 #00ffff, -1.5px 0 0 #ff0000'
        }}
      >
        FOLIOHUB.
      </span>
    </Link>
  );
}
