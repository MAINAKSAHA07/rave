'use client';
// Developed by mainak saha

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

  // Hide navigation on home page since it has its own header
  if (pathname === '/') {
    return null;
  }

  // Hide logout button on profile page (it has its own Sign Out button)
  const showLogout = pathname !== '/profile';

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[428px] mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Powerglide" className="h-8 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {showLogout && (
                  <Button onClick={handleLogout} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                    Logout
                  </Button>
                )}
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
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

