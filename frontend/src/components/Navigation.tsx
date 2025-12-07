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
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // Load selected location from localStorage or default
  useEffect(() => {
    const savedLocation = localStorage.getItem('selectedLocation');
    if (savedLocation) {
      setSelectedLocation(savedLocation);
    }
  }, []);

  // Fetch cities from events
  useEffect(() => {
    async function fetchCities() {
      try {
        const pb = getPocketBase();
        const now = new Date().toISOString();
        
        // Fetch all published events with future dates
        const events = await pb.collection('events').getFullList({
          filter: `status="published" && end_date >= "${now}"`,
          expand: 'venue_id',
          fields: 'id,city,expand.venue_id.city',
        });

        // Extract unique cities from events
        const cities = new Set<string>();
        events.forEach((event: any) => {
          // Try event.city first, then venue city
          const city = event.city || event.expand?.venue_id?.city;
          if (city && typeof city === 'string' && city.trim()) {
            cities.add(city.trim());
          }
        });

        const sortedCities = Array.from(cities).sort();
        setAvailableCities(sortedCities);

        // Set default location if not already set
        const currentLocation = selectedLocation || localStorage.getItem('selectedLocation');
        if (!currentLocation && sortedCities.length > 0) {
          const defaultCity = sortedCities[0];
          setSelectedLocation(defaultCity);
          localStorage.setItem('selectedLocation', defaultCity);
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
        // Fallback to default cities if fetch fails
        setAvailableCities(['Bangalore', 'Mumbai', 'Delhi']);
      }
    }

    if (mounted) {
      fetchCities();
    }
  }, [mounted]);

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
    <nav className="sticky top-0 z-50">
      <div className="max-w-[428px] mx-auto bg-[#1C1C1E]/90 backdrop-blur-md border-b border-white/10 shadow-lg px-4 py-2">
        <div className="flex justify-between items-center h-12 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/navbar_logo.png" alt="Powerglide" className="h-6 w-auto object-contain" />
            </Link>

            {/* Location Selector */}
            <div className="relative flex-1 max-w-[140px]">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full px-3 py-2 rounded-[12px] bg-[#2C2C2E] text-sm text-white hover:bg-[#3A3A3C] transition-all flex items-center justify-between gap-2 border border-white/5"
                disabled={availableCities.length === 0}
              >
                <span className="truncate text-[13px] font-medium">{selectedLocation || 'Select City'}</span>
                <span className="text-gray-400 flex-shrink-0 text-[10px]">▼</span>
              </button>

              {showLocationDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLocationDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-full bg-[#2C2C2E] rounded-[16px] border border-white/10 shadow-xl z-50 max-h-48 overflow-y-auto overflow-hidden py-1">
                    {availableCities.length > 0 ? (
                      availableCities.map((location, index) => (
                        <button
                          key={location}
                          onClick={() => {
                            setSelectedLocation(location);
                            localStorage.setItem('selectedLocation', location);
                            setShowLocationDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors ${selectedLocation === location ? 'text-[#7cffd6] font-medium bg-white/5' : 'text-gray-300'
                            }`}
                        >
                          {location}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400 text-center">Loading cities...</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Search Button */}
            <button
              onClick={() => router.push('/events')}
              className="w-9 h-9 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center transition-all border border-white/5 group"
              aria-label="Search"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {user ? (
              <>
                {showLogout && (
                  <Button
                    onClick={handleLogout}
                    className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-medium px-4 h-9 rounded-[12px] border border-white/5 transition-all"
                  >
                    Logout
                  </Button>
                )}
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-medium px-4 h-9 rounded-[12px] border border-white/5 transition-all"
                  >
                    Login
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

