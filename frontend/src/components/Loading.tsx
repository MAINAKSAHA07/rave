'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{
        backgroundColor: '#050509',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
      }}
    >

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Grey Transparent Background Container for Branding */}
        <div
          className="relative flex items-center justify-center p-8 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.12))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 14px 45px rgba(0,0,0,0.7), 0 0 18px rgba(168,85,247,0.35)'
          }}
        >
          {/* Breathing Glow Layout */}
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0))', filter: 'blur(12px)' }}></div>

          <Image
            src="/PG_logo.png"
            alt="Loading"
            width={120}
            height={120}
            className="object-contain animate-pulse md:w-40 md:h-40"
            priority
            style={{
              filter: 'drop-shadow(0 0 12px rgba(196,181,253,0.6))'
            }}
          />
        </div>

        {/* Optional Loading Text or dots */}
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0s', background: '#A855F7' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.1s', background: '#3B82F6' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s', background: '#C4B5FD' }} />
        </div>
      </div>
    </div>
  );
}


