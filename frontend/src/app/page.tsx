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

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] group"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
    >
      <div className="relative bg-[#0f1014]">
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
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%)'
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md"
              style={{ 
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.05em'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7cffd6]" style={{ boxShadow: '0 0 6px rgba(124, 255, 214, 0.6)' }}></span>
              {eventDate.getFullYear()} • {categoryTag.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content Section - Compact and Well-Spaced */}
        <div className="relative p-4 bg-[#0f1014]">
          {/* Event Title */}
          <h3 
            className="text-white font-bold mb-2 leading-tight line-clamp-2 group-hover:text-[#7cffd6] transition-colors duration-300" 
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
              className="text-[#7cffd6] font-bold tracking-tight flex items-baseline gap-0.5" 
              style={{ 
                fontSize: '18px',
                textShadow: '0 0 12px rgba(124, 255, 214, 0.4)',
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
  { id: 'music', name: 'Music', icon: Music, color: '#CE83FF' },
  { id: 'sports', name: 'Sport', icon: Trophy, color: '#FB4EFF' },
  { id: 'food', name: 'Food', icon: Utensils, color: '#7cffd6' },
  { id: 'concert', name: 'Concert', icon: Mic, color: '#CE83FF' },
  { id: 'comedy', name: 'Comedy', icon: Laugh, color: '#FB4EFF' },
  { id: 'nightlife', name: 'Nightlife', icon: Moon, color: '#7cffd6' },
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
        background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)'
      }}>
        <div className="max-w-[428px] mx-auto">
          {/* Top Header Bar */}
          <div className="sticky top-0 z-50" style={{ overflow: 'visible' }}>
            <div className="max-w-[428px] mx-auto glass-shimmer px-4 py-2" style={{ borderRadius: '0 0 20px 20px', overflow: 'visible' }}>
              <div className="flex justify-between items-center h-12 gap-3 relative z-10" style={{ overflow: 'visible' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0" style={{ overflow: 'visible' }}>
                  <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                    <img src="/navbar_logo.png" alt="PG" className="h-6 w-auto object-contain" />
                  </Link>

                  {/* Location Selector */}
                  <div className="relative flex-1 max-w-[140px] min-w-[100px]" style={{ overflow: 'visible', zIndex: 100 }}>
                    <button
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                      className="w-full px-3 py-2 rounded-[12px] bg-[#2C2C2E] text-sm text-white hover:bg-[#3A3A3C] transition-all flex items-center justify-between gap-2 border border-white/5"
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
                        <div className="absolute top-full left-0 mt-2 w-[180px] bg-[#2C2C2E] rounded-[16px] border border-white/10 shadow-xl z-[100] max-h-64 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
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
                                  ? 'text-[#7cffd6] font-medium bg-white/5'
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
                    className="w-9 h-9 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center transition-all border border-white/5 group"
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
                        className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-medium px-4 h-9 rounded-[12px] border border-white/5 transition-all"
                      >
                        Logout
                      </Button>
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
          </div>

          {/* Welcome Banner */}
          <div
            className="glass-card-shimmer relative mb-6 mx-4"
            style={{
              background: 'linear-gradient(135deg, #1E4C55 0%, #4ABBB0 50%, #1E4C55 100%)',
              padding: '28px',
              zIndex: 1,
            }}
          >
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
                className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition-all relative z-10"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: `
                    inset 0 0 8px rgba(168, 255, 247, 0.25),
                    0 0 12px #A8FFF7
                  `,
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                <Bell
                  className="w-5 h-5"
                  strokeWidth={1.5}
                  style={{
                    color: '#DFFCFB',
                    filter: 'drop-shadow(0 0 4px #A8FFF7)'
                  }}
                />
              </button>
            </div>
          </div>

          {/* Feature Highlights Section */}
          <div className="px-6 mb-8">
            <div className="flex flex-wrap gap-y-3">
              <div className="flex items-center gap-3 w-1/2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-[13px] font-medium">500+ events hosted</span>
              </div>
              <div className="flex items-center gap-3 w-1/2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-[13px] font-medium">Trusted by 50k users</span>
              </div>
              <div className="flex items-center gap-3 w-full mt-1">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-[13px] font-medium">Instant booking & secure payments</span>
              </div>
            </div>
          </div>

          {/* Category Section */}
          <div className="px-4 mb-8">
            <h2 className="text-white font-semibold mb-4 leading-tight" style={{ fontSize: '20px' }}>Category</h2>
            <div className="flex gap-4 overflow-x-auto py-6 scrollbar-hide" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
              {sortedCategories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;
                
                // Create gradient backgrounds
                const unselectedGradient = `linear-gradient(135deg, rgba(28, 28, 28, 0.4) 0%, rgba(40, 40, 42, 0.3) 100%)`;
                const selectedGradient = `linear-gradient(135deg, ${category.color}15 0%, ${category.color}25 50%, ${category.color}15 100%)`;
                
                // Neon glow effect for active state
                const neonGlow = isSelected 
                  ? `0 0 20px ${category.color}40, 0 0 40px ${category.color}30, 0 0 60px ${category.color}20, 0 4px 12px rgba(0,0,0,0.3)`
                  : '0 2px 8px rgba(0,0,0,0.15)';
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                    className={`flex flex-col items-center justify-center min-w-[100px] px-5 py-4 transition-all duration-300 hover:scale-[1.03] ${isSelected ? 'scale-[1.05]' : ''}`}
                    style={{
                      borderRadius: '24px',
                      background: isSelected ? selectedGradient : unselectedGradient,
                      boxShadow: neonGlow,
                      border: isSelected ? `1.5px solid ${category.color}80` : '1px solid rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }}
                  >
                    <IconComponent
                      className="pointer-events-none mb-2.5"
                      style={{
                        width: '28px',
                        height: '28px',
                        color: category.color,
                        strokeWidth: 2,
                        filter: isSelected 
                          ? `drop-shadow(0 0 8px ${category.color}80) brightness(1.2)` 
                          : `brightness(1.1)`,
                        opacity: isSelected ? 1 : 0.9,
                      }}
                    />
                    <span 
                      className={`text-xs leading-relaxed ${isSelected ? 'text-white font-bold' : 'text-gray-200 font-semibold'}`} 
                      style={{ 
                        fontSize: '12px',
                        textShadow: isSelected ? `0 0 8px ${category.color}40` : 'none',
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
              <h2 className="text-white font-semibold leading-tight" style={{ fontSize: '20px' }}>Popular Events</h2>
              <Link href="/events" className="text-[#7cffd6] text-sm font-medium hover:text-[#52C4A3] transition-colors" style={{ fontSize: '14px' }}>
                See all
              </Link>
            </div>
            <p className="text-gray-400 mb-5 leading-relaxed" style={{ fontSize: '14px' }}>Handpicked events happening near you this week</p>
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
                {popularEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
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
