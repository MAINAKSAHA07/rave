'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser, logout } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BrandReveal from '@/components/BrandReveal';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';

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

  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          {event.cover_image ? (
            <img
              src={getPocketBase().files.getUrl(event, event.cover_image)}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
              <span className="text-teal-600 text-4xl">🎵</span>
            </div>
          )}
        </div>
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50"
          onClick={(e) => {
            e.preventDefault();
            // Handle favorite
          }}
        >
          <span className="text-red-500 text-lg">❤️</span>
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-white text-xs font-medium mb-1">
            {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).toUpperCase()}
          </p>
          <h3 className="text-white font-bold text-lg">{event.name}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })} - {event.city}
          </span>
          <span className="text-teal-600 font-bold">
            ₹{minPrice ? minPrice.toFixed(0) : 'TBD'}
          </span>
        </div>
      </div>
    </Link>
  );
}

import MusicIcon3D from '@/components/icons/3d/MusicIcon3D';
import SportIcon3D from '@/components/icons/3d/SportIcon3D';
import FoodIcon3D from '@/components/icons/3d/FoodIcon3D';
import ConcertIcon3D from '@/components/icons/3d/ConcertIcon3D';
import ComedyIcon3D from '@/components/icons/3d/ComedyIcon3D';
import NightlifeIcon3D from '@/components/icons/3d/NightlifeIcon3D';

const CATEGORIES = [
  { id: 'music', name: 'Music', Component: MusicIcon3D },
  { id: 'sports', name: 'Sport', Component: SportIcon3D },
  { id: 'food', name: 'Food', Component: FoodIcon3D },
  { id: 'concert', name: 'Concert', Component: ConcertIcon3D },
  { id: 'comedy', name: 'Comedy', Component: ComedyIcon3D },
  { id: 'nightlife', name: 'Nightlife', Component: NightlifeIcon3D },
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

  const popularEvents = filteredEvents.slice(0, 5);

  return (
    <div className="min-h-screen pb-20">
      {/* Brand Reveal Animation */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-1000 ${showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <BrandReveal />
      </div>

      {/* Main Content */}
      <div className={`min-h-screen transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-[428px] mx-auto min-h-screen">
          {/* Top Header Bar */}
          <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/30 border-b border-gray-200/50 shadow-sm">
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
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${selectedLocation === location ? 'bg-teal-50 text-teal-600 font-medium' : 'text-gray-700'
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
                      <Button onClick={() => { logout(); router.push('/'); router.refresh(); }} variant="outline" size="sm" className="border-red-500 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-600 text-xs">
                        Logout
                      </Button>
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
          </div>

          {/* Welcome Banner */}
          <div className="relative bg-gradient-to-br from-teal-500/80 to-emerald-500/80 backdrop-blur-xl p-6 rounded-b-3xl border-b border-white/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                {user ? (
                  <>
                    <p className="text-teal-100 text-sm mb-1">Welcome back</p>
                    <h1 className="text-2xl font-bold text-white">
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </h1>
                  </>
                ) : (
                  <>
                    <p className="text-teal-100 text-sm mb-1">Welcome to PG Events</p>
                    <h1 className="text-2xl font-bold text-white">Discover Amazing Events</h1>
                  </>
                )}
              </div>
              {user && <NotificationBell />}
            </div>
            {!user && (
              <div className="flex gap-2 mt-4">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full bg-white text-teal-600 hover:bg-teal-50">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
              <div className="w-full h-full bg-white rounded-full blur-2xl"></div>
            </div>
          </div>

          {/* Category Section */}
          <div className="px-4 mb-6 mt-6">
            <h2 className="text-lg font-bold text-white mb-4">Category</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  className={`flex flex-col items-center justify-center min-w-[100px] h-28 rounded-2xl transition-all ${selectedCategory === category.id
                    ? 'bg-white/20 shadow-lg scale-105 border border-teal-400'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                >
                  <div className="w-16 h-16 pointer-events-none">
                    <category.Component />
                  </div>
                  <span className={`text-sm font-medium mt-2 ${selectedCategory === category.id ? 'text-white' : 'text-gray-300'}`}>
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Events Section */}
          <div className="px-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Popular Events</h2>
              <Link href="/events" className="text-teal-400 text-sm font-medium hover:text-teal-300">
                See More
              </Link>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : popularEvents.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <p className="text-gray-400">No events available at the moment.</p>
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
