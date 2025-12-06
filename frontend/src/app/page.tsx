'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
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

const CATEGORIES = [
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'sports', name: 'Sport', icon: '⚽' },
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'concert', name: 'Concert', icon: '🎤' },
  { id: 'comedy', name: 'Comedy', icon: '😂' },
  { id: 'nightlife', name: 'Nightlife', icon: '🌃' },
];

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if this is a reload (hard refresh) or first load
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigation?.type === 'reload';
    const hasSeenInSession = sessionStorage.getItem('hasSeenBrandReveal');
    
    // Clear sessionStorage on hard refresh to show animation again
    if (isReload) {
      sessionStorage.removeItem('hasSeenBrandReveal');
    }
    
    // Show brand reveal on first load or hard refresh
    if (isReload || !hasSeenInSession) {
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
      // Skip brand reveal if already seen in this session (normal navigation)
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
        <div className="max-w-[428px] mx-auto bg-white min-h-screen">
          {/* Top Header Bar */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <img src="/logo.png" alt="PG Events" className="h-6 w-auto" />
              <span className="ml-2 text-lg font-bold text-gray-900">PG Events</span>
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-900">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                <span className="text-gray-400">▼</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>

          {/* Welcome Banner */}
          <div className="relative bg-gradient-to-br from-teal-500 to-emerald-500 p-6 rounded-b-3xl">
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

          {/* Search Bar */}
          <div className="px-4 -mt-4 mb-6">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search Event"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
            </div>
          </div>

          {/* Category Section */}
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Category</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  className={`flex flex-col items-center justify-center min-w-[80px] h-20 rounded-xl transition-all ${
                    selectedCategory === category.id
                      ? 'bg-teal-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-2xl mb-1">{category.icon}</span>
                  <span className="text-xs font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Events Section */}
          <div className="px-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Popular Event</h2>
              <Link href="/events" className="text-teal-600 text-sm font-medium">
                See More
              </Link>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : popularEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600">No events available at the moment.</p>
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
