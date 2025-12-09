'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isOrganizerPage = pathname === '/become-organizer';

  return (
    <footer className="mt-auto">
      {/* Dark section with "List your event with us" */}
      {!isOrganizerPage && (
        <div className="px-4 pt-0 pb-1">
          <div className="max-w-[428px] mx-auto flex justify-center">
            <Link
              href="/become-organizer"
              className="
                relative px-6 py-2 rounded-full 
                bg-gradient-to-r from-[#CE83FF]/10 to-[#7cffd6]/10 
                border border-white/10 hover:border-white/20
                flex items-center gap-2 transition-all duration-300 hover:scale-105
                group
              "
              style={{
                boxShadow: '0 0 20px rgba(206, 131, 255, 0.15)',
              }}
            >
              <span className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#CE83FF] to-[#7cffd6]">
                List your event with us
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Copyright - positioned above bottom nav */}
      <div className="pb-16">
        <div className="max-w-[428px] mx-auto px-4">
          <div className="text-[10px] text-center text-white/20">
            © 2025 Powerglide. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

