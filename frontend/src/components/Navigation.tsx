'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getPocketBase, getCurrentUser, logout, isAuthenticated } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pb = getPocketBase();
    setUser(getCurrentUser());

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(getCurrentUser());
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function handleLogout() {
    logout();
    router.push('/');
    router.refresh();
  }

  if (!mounted) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-[428px] mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Powerglide" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/events"
                className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-all ${pathname === '/events'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Events
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-tickets"
                    className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-all ${pathname === '/my-tickets'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    Tickets
                  </Link>
                  <Link
                    href="/profile"
                    className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-all ${pathname === '/profile'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    Profile
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors w-9 h-9"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 font-medium hover:text-purple-600 hover:bg-purple-50 text-xs px-3">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 text-xs px-4 rounded-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

