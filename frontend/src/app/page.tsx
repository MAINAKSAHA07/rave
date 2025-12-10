'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser, logout } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BrandReveal from '@/components/BrandReveal';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import { Bell, Music, Trophy, Utensils, Mic, Laugh, Moon, Heart, Users, User, Zap } from 'lucide-react';

// Event Card Component
function EventCard({ event }: { event: any }) {
  const [minPrice, setMinPrice] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const pb = getPocketBase();
        const ticketTypes = await pb.collection('ticket_types').getFullList({
          filter: `event_id="${event.id}"`,
        });
        if (ticketTypes.length > 0) {
          const prices = ticketTypes.map((tt: any) => tt.final_price_minor);
          // Calculate price without GST (assuming 18% GST)
          // base_price = final_price / 1.18
          const pricesWithoutGst = prices.map((price: number) => price / 1.18);
          setMinPrice(Math.min(...pricesWithoutGst) / 100);
        }
      } catch {
        // Ignore errors
      }
    }
    fetchPrice();
  }, [event.id]);

  const eventDate = new Date(event.event_date || event.start_date);
  const formattedDate = eventDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const categoryTag = event.category || 'Event';

  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      if (heroRef.current) {
        const y = window.scrollY || 0;
        heroRef.current.style.transform = `translateY(${-(y * 0.08)}px)`;
      }
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block rounded-[20px] overflow-hidden hover:scale-[1.02]"
      style={{ 
        boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
        transition: 'transform var(--motion-duration-sm) var(--motion-ease-enter), box-shadow var(--motion-duration-sm) var(--motion-ease-enter), opacity var(--motion-duration-sm) var(--motion-ease-enter)'
      }}
    >
      <div className="relative bg-[#0f1014]">
        <div className="pointer-events-none absolute inset-[-8px] rounded-[24px] opacity-0 group-hover:opacity-50 blur-[20px] transition-opacity duration-200" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(59,130,246,0.25), rgba(196,181,253,0.2))' }} />
        {/* Main Image Section - Larger and More Prominent */}
        <div className="relative h-[200px] w-full overflow-hidden">
          {event.cover_image ? (
            <>
              <img
                src={getPocketBase().files.getUrl(event, event.cover_image)}
                alt={event.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                style={{ objectPosition: 'center' }}
              />
              {/* Stronger Overlay Gradient */}
                <div 
                  className="absolute inset-0 transition-opacity duration-200 group-hover:opacity-95"
                style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.9) 100%)',
                    opacity: 0.85
                }}
              />
              {/* Additional gradient for better text readability */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-32"
                style={{
                  background: 'linear-gradient(to top, rgba(15, 16, 20, 0.95) 0%, transparent 100%)'
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1b26] to-[#0f1014]">
              <Moon className="w-20 h-20 text-white/10" />
            </div>
          )}
          
          {/* Professional Tag Badge - Top Right */}
          <div className="absolute top-3 right-3 z-10">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md badge-animate"
              style={{ 
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.05em'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C4B5FD', boxShadow: '0 0 6px rgba(196, 181, 253, 0.7)' }}></span>
              {eventDate.getFullYear()} • {categoryTag.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content Section - Compact and Well-Spaced */}
        <div className="relative p-4 bg-[#0f1014]">
          {/* Event Title */}
          <h3 
            className="text-white font-bold mb-2 leading-tight line-clamp-2 group-hover:text-[#C4B5FD] transition-colors duration-300" 
            style={{ 
              fontSize: '18px',
              letterSpacing: '-0.01em',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {event.name}
          </h3>
          
          {/* Description */}
          <p 
            className="text-gray-400 text-[12px] leading-relaxed mb-3 line-clamp-2" 
            style={{ 
              lineHeight: '1.5',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {event.description ? event.description.split('.')[0] : 'Join us for an amazing experience'}
          </p>

          {/* Bottom Row - Date, Location, Price */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex flex-col gap-0.5">
              <p 
                className="text-white/80 text-[11px] font-medium leading-tight"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {formattedDate}
              </p>
              <p 
                className="text-gray-500 text-[10px] font-medium"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {event.city || 'Location'}
              </p>
            </div>
            <span 
              className="text-[#3B82F6] font-bold tracking-tight flex items-baseline gap-0.5" 
              style={{ 
                fontSize: '18px',
                textShadow: '0 0 12px rgba(59, 130, 246, 0.35)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              <span className="text-[12px] font-semibold opacity-90">₹</span>
              {minPrice ? minPrice.toFixed(0) : 'TBD'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const CATEGORIES = [
  { id: 'music', name: 'Music', icon: Music, color: '#A855F7' },
  { id: 'sports', name: 'Sport', icon: Trophy, color: '#3B82F6' },
  { id: 'food', name: 'Food', icon: Utensils, color: '#C4B5FD' },
  { id: 'concert', name: 'Concert', icon: Mic, color: '#A855F7' },
  { id: 'comedy', name: 'Comedy', icon: Laugh, color: '#3B82F6' },
  { id: 'nightlife', name: 'Nightlife', icon: Moon, color: '#C4B5FD' },
];

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const prevCategoryRef = useRef<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      if (heroRef.current) {
        const y = window.scrollY || 0;
        heroRef.current.style.transform = `translateY(${-(y * 0.08)}px)`;
      }
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Load selected location from localStorage or default
  useEffect(() => {
    const savedLocation = localStorage.getItem('selectedLocation');
    if (savedLocation) {
      setSelectedLocation(savedLocation);
    }
  }, []);

  // Trigger confetti effect when nightlife category is selected
  useEffect(() => {
    const isNightlife = selectedCategory === 'nightlife';
    const wasNightlife = prevCategoryRef.current === 'nightlife';

    // Only trigger if nightlife was just selected (not deselected)
    if (isNightlife && !wasNightlife) {
      // Dynamically import and trigger confetti
      (async () => {
        const confetti = (await import('canvas-confetti')).default;

        // Bursting cracker effect
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval: NodeJS.Timeout = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);

          // Launch from multiple positions for bursting effect
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 }
          });
        }, 250);

        // Cleanup
        setTimeout(() => clearInterval(interval), duration);
      })();
    }

    // Update previous category
    prevCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

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

    fetchCities();
  }, []);

  useEffect(() => {
    // Check if this is the very first page load (not a navigation)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isFirstLoad = navigation?.type === 'navigate' && !sessionStorage.getItem('hasSeenBrandReveal');

    // Show brand reveal only on very first load
    if (isFirstLoad) {
      // Show brand reveal for 15 seconds
      const timer = setTimeout(() => {
        setShowContent(true);
        sessionStorage.setItem('hasSeenBrandReveal', 'true');
      }, 15000);

      loadFeaturedEvents();
      const pb = getPocketBase();
      const currentUser = getCurrentUser();
      setUser(currentUser);

      // Listen for auth changes
      const unsubscribe = pb.authStore.onChange(() => {
        setUser(getCurrentUser());
      });

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    } else {
      // Skip brand reveal on all navigations (including home button click)
      setShowContent(true);

      loadFeaturedEvents();
      const pb = getPocketBase();
      const currentUser = getCurrentUser();
      setUser(currentUser);

      // Listen for auth changes
      const unsubscribe = pb.authStore.onChange(() => {
        setUser(getCurrentUser());
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  async function loadFeaturedEvents() {
    try {
      const pb = getPocketBase();
      const now = new Date().toISOString();
      const eventsData = await pb.collection('events').getFullList({
        filter: `status="published" && end_date >= "${now}"`,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
        limit: 10,
      });
      setEvents(eventsData as any);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter((event) => {
    if (selectedCategory && event.category !== selectedCategory) return false;
    if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate event counts per category and sort categories
  const categoryCounts = CATEGORIES.map(category => {
    const count = events.filter(event => {
      const eventCategory = (event.category || '').toLowerCase();
      return eventCategory === category.id;
    }).length;
    return { ...category, count };
  });

  // Sort categories by event count (descending), then by name if counts are equal
  const sortedCategories = [...categoryCounts].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count; // Sort by count descending
    }
    return a.name.localeCompare(b.name); // If counts are equal, sort alphabetically
  });

  const popularEvents = filteredEvents.slice(0, 5);

  return (
    <div className="pb-6">
      {/* Brand Reveal Animation */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-1000 ${showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <BrandReveal />
      </div>
      {/* Main Content */}
      <div className={`transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{
        backgroundColor: '#0D0D12',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(140,100,255,0.25), transparent 60%),
          radial-gradient(circle at 80% 90%, rgba(90,120,255,0.15), transparent 70%),
          radial-gradient(circle at 20% 10%, rgba(168,85,247,0.12), rgba(59,130,246,0.08), rgba(12,10,24,0)),
          radial-gradient(circle at 80% 0%, rgba(196,181,253,0.09), rgba(12,10,24,0))
        `
      }}>
        <div className="max-w-[428px] mx-auto">
          {/* Top Header Bar */}
          <div className="sticky top-0 z-50" style={{ overflow: 'visible' }}>
            <div className="max-w-[428px] mx-auto px-4 py-2" style={{
              borderRadius: '0 0 20px 20px',
              overflow: 'visible',
              background: 'linear-gradient(180deg, #101019 0%, #050509 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 14px 45px rgba(0,0,0,0.7)'
            }}>
              <div className="flex justify-between items-center h-12 gap-3 relative z-10" style={{ overflow: 'visible' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0" style={{ overflow: 'visible' }}>
                  <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                    <img src="/navbar_logo.png" alt="PG" className="h-6 w-auto object-contain" />
                  </Link>

                  {/* Location Selector */}
                  <div className="relative flex-1 max-w-[140px] min-w-[100px]" style={{ overflow: 'visible', zIndex: 100 }}>
                    <button
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                      className="w-full px-3 py-2 text-sm text-white hover:bg-[#3A3A3C] transition-all flex items-center justify-between gap-2"
                      style={{
                        height: '44px',
                        borderRadius: '999px',
                        background: '#1A1A22',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                      disabled={availableCities.length === 0}
                    >
                      <span className="truncate text-[13px] font-medium">{selectedLocation || 'Select City'}</span>
                      <span className={`text-gray-400 flex-shrink-0 text-[10px] transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {showLocationDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-[45]"
                          onClick={() => setShowLocationDropdown(false)}
                        />
                        <div className="absolute top-full left-0 mt-2 w-[180px] bg-[#1A1A22] rounded-[16px] border border-white/12 shadow-xl z-[100] max-h-64 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
                          {availableCities.length > 0 ? (
                            availableCities.map((location) => (
                              <button
                                key={location}
                                onClick={() => {
                                  setSelectedLocation(location);
                                  localStorage.setItem('selectedLocation', location);
                                  setShowLocationDropdown(false);
                                  // Trigger page refresh to update filtered events
                                  if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new Event('locationChanged'));
                                  }
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors ${selectedLocation === location
                                  ? 'text-[#3B82F6] font-medium bg-white/5'
                                  : 'text-gray-300'
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
                    className="flex items-center justify-center transition-all group"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '999px',
                      background: '#1A1A22',
                      border: '1px solid rgba(255,255,255,0.12)'
                    }}
                    aria-label="Search"
                  >
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>

                  {user ? (
                    <>
                      <Button
                        onClick={() => { logout(); router.push('/'); router.refresh(); }}
                        className="text-white text-xs font-medium px-4 transition-all"
                        style={{
                          height: '44px',
                          borderRadius: '999px',
                          background: '#1A1A22',
                          border: '1px solid rgba(255,255,255,0.12)'
                        }}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button
                          className="text-white text-xs font-medium px-4 transition-all"
                          style={{
                            height: '44px',
                            borderRadius: '999px',
                            background: '#1A1A22',
                            border: '1px solid rgba(255,255,255,0.12)'
                          }}
                        >
                          Login
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Banner */}
          <div
            className="relative mb-6 mx-4 motion-fade-in-up"
            style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, #846BFF 0%, #6EA8FF 50%, #C3B8FF 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '28px',
              zIndex: 1,
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: `
                inset 0 0 80px rgba(255,255,255,0.12),
                0 0 30px rgba(120,80,255,0.35),
                0 10px 40px rgba(0,0,0,0.4)
              `,
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
              position: 'relative',
              overflow: 'hidden',
              backgroundSize: '200% 200%',
              animation: 'gradient-drift 12s ease-in-out infinite'
            }}
            ref={heroRef}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                mixBlendMode: 'screen',
                pointerEvents: 'none'
              }}
            />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p
                  className="text-sm mb-2 leading-relaxed"
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    textShadow: '0 0 6px rgba(255,255,255,0.12)',
                    marginBottom: '8px'
                  }}
                >
                  Welcome back
                </p>
                <h1
                  className="font-bold leading-tight mb-2"
                  style={{
                    fontSize: '26px',
                    color: '#FFFFFF',
                    textShadow: '0 0 6px rgba(255,255,255,0.12)',
                    letterSpacing: '-0.02em',
                    marginBottom: '8px'
                  }}
                >
                  Hero
                </h1>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.85)',
                    textShadow: '0 0 6px rgba(255,255,255,0.12)'
                  }}
                >
                  Ready for your next experience?
                </p>
              </div>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all relative z-10 hover:scale-[1.08] active:scale-95 hover:shadow-[0_0_22px_rgba(168,85,247,0.65)]"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(168,85,247,0.35), rgba(59,130,246,0.15), rgba(12,10,24,0))',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 0 18px rgba(168,85,247,0.55)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  animation: 'bell-pulse 4s ease-in-out infinite',
                  transition: 'transform var(--motion-duration-sm) var(--motion-ease-enter), box-shadow var(--motion-duration-sm) var(--motion-ease-enter)'
                }}
              >
                <Bell
                  className="w-5 h-5"
                  strokeWidth={1.5}
                  style={{
                    color: '#FFFFFF',
                    filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.75))'
                  }}
                />
              </button>
            </div>
          </div>

          {/* Feature Highlights Section */}
          <div className="px-6 mb-8">
            <div className="flex flex-wrap gap-y-3">
              <div className="flex items-center gap-3 w-1/2">
                <Users 
                  className="flex-shrink-0" 
                  style={{
                    width: '24px',
                    height: '24px',
                    color: '#C4B5FD',
                    strokeWidth: 1.5,
                    filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.6))'
                  }}
                />
                <span className="text-gray-400 text-[13px] font-medium">500+ events hosted</span>
              </div>
              <div className="flex items-center gap-3 w-1/2">
                <User 
                  className="flex-shrink-0" 
                  style={{
                    width: '24px',
                    height: '24px',
                    color: '#C4B5FD',
                    strokeWidth: 1.5,
                    filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.6))'
                  }}
                />
                <span className="text-gray-400 text-[13px] font-medium">Trusted by 50k users</span>
              </div>
              <div className="flex items-center gap-3 w-full mt-1">
                <Zap 
                  className="flex-shrink-0" 
                  style={{
                    width: '24px',
                    height: '24px',
                    color: '#C4B5FD',
                    strokeWidth: 1.5,
                    filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.6))'
                  }}
                />
                <span className="text-gray-400 text-[13px] font-medium">Instant booking & secure payments</span>
              </div>
            </div>
          </div>

          {/* Category Section */}
          <div className="px-4" style={{ marginTop: '28px', marginBottom: '16px' }}>
            <h2 className="text-white font-semibold mb-4 leading-tight" style={{ fontSize: '20px' }}>Category</h2>
            <div className="flex flex-wrap gap-3 py-6" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
              {sortedCategories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;
                
                const unselectedBg = '#101019';
                const selectedBg = 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)';
                const boxShadow = isSelected
                  ? 'inset 0 0 0 1px rgba(255,255,255,0.18), 0 2px 12px rgba(168,85,247,0.45)'
                  : '0 2px 8px rgba(0,0,0,0.25)';
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                    className={`group flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.03] ${isSelected ? 'scale-[1.04]' : ''} hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)]`}
                    style={{
                      height: '78px',
                      width: '78px',
                      borderRadius: '999px',
                      background: isSelected ? selectedBg : 'radial-gradient(circle at center, #2A2638 0%, #1A1824 100%)',
                      boxShadow,
                      border: isSelected ? '1.5px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      transition: 'transform 200ms cubic-bezier(0.18,0.89,0.32,1.28), box-shadow 200ms cubic-bezier(0.18,0.89,0.32,1.28), background 200ms ease-out, color 200ms ease-out',
                      gap: '6px'
                    }}
                  >
                    <IconComponent
                      className="pointer-events-none"
                      style={{
                        width: '22px',
                        height: '22px',
                        color: isSelected ? '#FFFFFF' : '#C4B5FD',
                        strokeWidth: 2,
                        filter: isSelected 
                          ? `drop-shadow(0 0 8px rgba(196,181,253,0.8)) brightness(1.1)` 
                          : `brightness(1.05)`,
                        opacity: 1,
                      }}
                    />
                    <span 
                      className={`text-[11px] leading-relaxed ${isSelected ? 'text-white font-bold' : 'text-white/70 font-semibold'}`} 
                      style={{ 
                        textShadow: isSelected ? `0 0 8px rgba(168,85,247,0.4)` : 'none',
                      }}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Popular Events Section */}
          <div className="px-4 mb-6 pb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-white font-semibold leading-tight slide-in-left" style={{ fontSize: '20px' }}>Popular Events</h2>
              <Link href="/events" className="text-[#3B82F6] text-sm font-medium hover:text-[#C4B5FD] transition-colors" style={{ fontSize: '14px' }}>
                See all
              </Link>
            </div>
            <p className="text-white/60 mb-5 leading-relaxed slide-in-left" style={{ fontSize: '13px' }}>Handpicked events happening near you this week</p>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 rounded-[22px] bg-white/5 animate-pulse" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                ))}
              </div>
            ) : popularEvents.length === 0 ? (
              <div className="text-center py-12 rounded-xl backdrop-blur-md" style={{
                background: 'rgba(28, 28, 28, 0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p className="text-gray-400" style={{ fontSize: '14px', lineHeight: '1.6' }}>No events available at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {popularEvents.map((event, idx) => (
                  <div key={event.id} style={{ opacity: 0, animation: 'slide-in-left var(--motion-duration-md) var(--motion-ease-enter) forwards', animationDelay: `${80 * idx}ms` }}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
