'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{
        background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)',
      }}
    >

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Grey Transparent Background Container for Branding */}
        <div
          className="relative flex items-center justify-center p-8 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Breathing Glow Layout */}
          <div className="absolute inset-0 rounded-full animate-pulse bg-white/5 blur-xl"></div>

          <Image
            src="/PG_logo.png"
            alt="Loading"
            width={120}
            height={120}
            className="object-contain animate-pulse md:w-40 md:h-40"
            priority
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))'
            }}
          />
        </div>

        {/* Optional Loading Text or dots */}
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
