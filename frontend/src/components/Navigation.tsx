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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[428px] mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-purple-600 hover:opacity-80 transition-opacity">
              Rave
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/events"
                className={`text-sm font-medium transition-colors ${pathname === '/events' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'
                  }`}
              >
                Events
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-tickets"
                    className={`text-sm font-medium transition-colors ${pathname === '/my-tickets' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'
                      }`}
                  >
                    Tickets
                  </Link>
                  <Link
                    href="/profile"
                    className={`text-sm font-medium transition-colors ${pathname === '/profile' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'
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
              <>
                <span className="text-xs text-gray-600 hidden sm:inline max-w-[100px] truncate">
                  {user.name || user.email}
                </span>
                <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

