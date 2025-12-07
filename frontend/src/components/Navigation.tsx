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
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/30 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-[428px] mx-auto px-4">
        <div className="flex justify-between items-center h-14 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/logo.png" alt="Powerglide" className="h-8 w-auto" />
            </Link>
            
            {/* Location Selector */}
            <div className="relative flex-1 max-w-[140px]">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white/50 backdrop-blur-sm text-sm text-gray-700 hover:bg-white/70 transition-all flex items-center justify-between gap-2"
                disabled={availableCities.length === 0}
              >
                <span className="truncate">{selectedLocation || 'Select City'}</span>
                <span className="text-gray-500 flex-shrink-0 text-xs">▼</span>
              </button>
              
              {showLocationDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowLocationDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-48 overflow-y-auto">
                    {availableCities.length > 0 ? (
                      availableCities.map((location, index) => (
                        <button
                          key={location}
                          onClick={() => {
                            setSelectedLocation(location);
                            localStorage.setItem('selectedLocation', location);
                            setShowLocationDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                            selectedLocation === location ? 'bg-teal-50 text-teal-600 font-medium' : 'text-gray-700'
                          } ${index === 0 ? 'rounded-t-lg' : ''} ${index === availableCities.length - 1 ? 'rounded-b-lg' : ''}`}
                        >
                          {location}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">Loading cities...</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Button */}
            <button
              onClick={() => router.push('/events')}
              className="w-9 h-9 rounded-full border border-gray-300 bg-white/50 backdrop-blur-sm hover:bg-white/70 flex items-center justify-center transition-all"
              aria-label="Search"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {user ? (
              <>
                {showLogout && (
                  <Button onClick={handleLogout} variant="outline" size="sm" className="border-red-500 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-600 text-xs">
                    Logout
                  </Button>
                )}
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs">
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

