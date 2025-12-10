'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import BottomNavigation from '@/components/BottomNavigation';
import { Calendar, Sparkles, Filter, Eye, MapPin } from 'lucide-react';

const FILTER_CHIPS = [
  'Today',
  'Tomorrow',
  'This Weekend',
  'DJ Night',
  'Bollywood Night',
  'Food',
  'Comedy',
  'Concert',
];

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('All Events');
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const prevFiltersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get selected city from localStorage
    const savedCity = localStorage.getItem('selectedLocation');
    if (savedCity) {
      setSelectedCity(savedCity);
    }
    loadEvents();

    // Listen for location changes from navbar
    const handleLocationChange = () => {
      const newCity = localStorage.getItem('selectedLocation');
      if (newCity) {
        setSelectedCity(newCity);
      }
    };

    window.addEventListener('locationChanged', handleLocationChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange);
    };
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const pb = getPocketBase();
      const now = new Date().toISOString();
      let filter = `status="published" && end_date >= "${now}"`;

      const eventsData = await pb.collection('events').getFullList({
        filter: filter || undefined,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
      });

      // Get ticket prices and interested counts for each event
      const eventsWithPrices = await Promise.all(
        eventsData.map(async (event: any) => {
          try {
            const ticketTypes = await pb.collection('ticket_types').getFullList({
              filter: `event_id="${event.id}"`,
            });
            if (ticketTypes.length > 0) {
              const prices = ticketTypes.map((tt: any) => tt.final_price_minor);
              const pricesWithoutGst = prices.map((price: number) => price / 1.18);
              event.minPrice = Math.min(...pricesWithoutGst) / 100;
              event.maxPrice = Math.max(...pricesWithoutGst) / 100;
            }
            
            // Get interested count (orders count for this event)
            try {
              const orders = await pb.collection('orders').getFullList({
                filter: `event_id="${event.id}" && status="paid"`,
              });
              event.interestedCount = orders.reduce((sum: number, order: any) => sum + (order.ticket_count || 0), 0);
            } catch {
              event.interestedCount = 0;
            }
          } catch {
            // Ignore errors
          }
          return event;
        })
      );

      setEvents(eventsWithPrices as any);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to check if event is on a specific date
  const isEventOnDate = (event: any, targetDate: Date) => {
    const eventDate = new Date(event.event_date || event.start_date);
    return (
      eventDate.getDate() === targetDate.getDate() &&
      eventDate.getMonth() === targetDate.getMonth() &&
      eventDate.getFullYear() === targetDate.getFullYear()
    );
  };

  // Helper function to check if event is this weekend
  const isEventThisWeekend = (event: any) => {
    const eventDate = new Date(event.event_date || event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = 6 - dayOfWeek;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    
    eventDate.setHours(0, 0, 0, 0);
    
    return eventDate >= saturday && eventDate <= sunday;
  };

  // Helper function to check if event is NYE 2026
  const isNYE2026 = (event: any) => {
    const eventDate = new Date(event.event_date || event.start_date);
    const eventName = (event.name || '').toLowerCase();
    return (
      (eventDate.getFullYear() === 2026 && eventDate.getMonth() === 11 && eventDate.getDate() === 31) ||
      eventName.includes('new year') ||
      eventName.includes('nye') ||
      eventName.includes('2026')
    );
  };

  // Filter events based on selected city (case-insensitive, trimmed)
  let filteredEvents = events;
  if (selectedCity && selectedCity.trim()) {
    const cityFiltered = events.filter((e) => {
      const eventCity = (e.city || e.expand?.venue_id?.city || '').toString().trim();
      const selectedCityTrimmed = selectedCity.trim();
      if (!eventCity) return false; // Skip events without city
      const matches = eventCity.toLowerCase() === selectedCityTrimmed.toLowerCase();
      return matches;
    });
    filteredEvents = cityFiltered;
  }

  // Apply tab filters
  if (selectedTab === 'NYE 2026') {
    filteredEvents = filteredEvents.filter(isNYE2026);
  } else if (selectedTab === 'Activities') {
    // Activities = workshops, sports, and other activity-based categories
    filteredEvents = filteredEvents.filter((e) => {
      const category = (e.category || '').toLowerCase();
      return ['workshop', 'sports', 'other', 'festival'].includes(category);
    });
  }
  // 'All Events' tab shows all events (no additional filtering)

  // Apply filter chips
  if (selectedFilters.size > 0) {
    filteredEvents = filteredEvents.filter((event) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const category = (event.category || '').toLowerCase();
      const eventName = (event.name || '').toLowerCase();
      
      // Check if event matches any selected filter
      return Array.from(selectedFilters).some((filter) => {
        switch (filter) {
          case 'Today':
            return isEventOnDate(event, today);
          case 'Tomorrow':
            return isEventOnDate(event, tomorrow);
          case 'This Weekend':
            return isEventThisWeekend(event);
          case 'DJ Night':
            return category === 'nightlife' || eventName.includes('dj') || eventName.includes('night');
          case 'Bollywood Night':
            return eventName.includes('bollywood') || eventName.includes('bollywood night');
          case 'Food':
            return category === 'food' || eventName.includes('food');
          case 'Comedy':
            return category === 'comedy' || eventName.includes('comedy');
          case 'Concert':
            return category === 'concert' || eventName.includes('concert');
          default:
            return false;
        }
      });
    });
  }

  // Sort events by start date
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.start_date || a.event_date).getTime();
    const dateB = new Date(b.start_date || b.event_date).getTime();
    return dateA - dateB;
  });

  // Featured events (first 6)
  const featuredEvents = sortedEvents.slice(0, 6);

  // Handpicked events (next 6) - only show if we have enough events
  const handpickedEvents = sortedEvents.length > 6 ? sortedEvents.slice(6, 12) : [];

  // All events should appear in the "All Experiences" section
  // This ensures events are always visible even if they're in featured/handpicked
  const allEvents = sortedEvents;

  // Trigger confetti effect when nightlife/DJ Night filter is selected
  useEffect(() => {
    const hasNightlife = selectedFilters.has('DJ Night');
    const prevHasNightlife = prevFiltersRef.current.has('DJ Night');
    
    // Only trigger if nightlife filter was just added (not removed)
    if (hasNightlife && !prevHasNightlife) {
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

        const interval: NodeJS.Timeout = setInterval(function() {
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

        // Cleanup interval on unmount or when filter changes
        setTimeout(() => clearInterval(interval), duration);
      })();
    }
    
    // Update previous filters
    prevFiltersRef.current = new Set(selectedFilters);
  }, [selectedFilters]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const updateIndicator = () => {
      const el = tabRefs.current[selectedTab];
      if (el) {
        const rect = el.getBoundingClientRect();
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect) {
          setTabIndicator({ left: rect.left - parentRect.left, width: rect.width });
        }
      }
    };
    requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [selectedTab]);

  return (
    <div 
      className="min-h-screen pb-20"
      style={{
        backgroundColor: '#050509',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
      }}
    >
      <div className="max-w-[428px] mx-auto min-h-screen">
        {/* Top Navigation Tabs with sliding indicator */}
        <div className="sticky top-0 z-20 backdrop-blur-md" style={{ background: 'transparent', borderBottom: 'none' }}>
          <div className="relative flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {['All Events', 'NYE 2026', 'Activities'].map((tab) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[tab] = el; }}
                onClick={() => setSelectedTab(tab)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative"
                style={{
                  color: selectedTab === tab ? '#FFFFFF' : '#9B9B9B',
                  transition: 'color 180ms var(--motion-ease-enter)'
                }}
              >
                {tab === 'All Events' && <Calendar className="w-4 h-4" />}
                {tab === 'NYE 2026' && <Sparkles className="w-4 h-4" />}
                {tab === 'Activities' && <Sparkles className="w-4 h-4" />}
                <span>{tab}</span>
              </button>
            ))}
            <div
              className="absolute bottom-0 h-0.5 rounded-full"
              style={{
                left: tabIndicator.left,
                width: tabIndicator.width,
                background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)',
                boxShadow: '0 0 8px rgba(168,85,247,0.45)',
                transition: 'left 200ms var(--motion-ease-enter), width 200ms var(--motion-ease-enter)'
              }}
            />
          </div>
        </div>

        {/* Filter Chips Row */}
        <div className="px-4 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {FILTER_CHIPS.map((filter) => {
              const isSelected = selectedFilters.has(filter);
              return (
                <button
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'text-white font-bold'
                      : 'text-white border border-[#9B9B9B]/30'
                  }`}
                  style={
                    isSelected
                      ? {
                          background: '#A855F7',
                          border: '1px solid #A855F7',
                          boxShadow: '0 0 12px rgba(168, 85, 247, 0.6)',
                        }
                      : {
                          background: 'rgba(26, 27, 38, 0.6)',
                          backdropFilter: 'blur(10px)',
                        }
                  }
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1 - Featured Events Near You */}
        <div className="px-4 py-6">
          <h2 className="text-white font-bold text-xl mb-1">Featured Events Near You</h2>
          <p className="text-[#9B9B9B] text-xs mb-4">
            Popular right now in {selectedCity || 'your city'}
          </p>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-64 h-80 rounded-[18px] bg-[rgba(26,27,38,0.6)] animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : featuredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9B9B9B]">No featured events found.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {featuredEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block flex-shrink-0 w-64 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] group"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                >
                  <div className="relative bg-[#0f1014]">
                    {/* Image Section */}
                    <div className="relative h-[240px] w-full overflow-hidden">
                      {event.cover_image ? (
                        <>
                          <img
                            src={getPocketBase().files.getUrl(event, event.cover_image)}
                            alt={event.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            style={{ objectPosition: 'center' }}
                          />
                          {/* Gradient Overlay */}
                          <div 
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%)'
                            }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-32"
                            style={{
                              background: 'linear-gradient(to top, rgba(15, 16, 20, 0.95) 0%, transparent 100%)'
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1b26] to-[#0f1014]">
                          <span className="text-4xl">🎵</span>
                        </div>
                      )}
                      {/* Price overlay */}
                      {event.minPrice && (
                        <div 
                          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur-md"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <span className="text-white font-bold text-sm">₹{event.minPrice.toFixed(0)}</span>
                        </div>
                      )}
                      {/* People count overlay */}
                      {event.interestedCount > 0 && (
                        <div 
                          className="absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white text-xs">
                            {event.interestedCount >= 1000 
                              ? `${(event.interestedCount / 1000).toFixed(1)}k`
                              : event.interestedCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content Section */}
                    <div className="p-3 bg-[#0f1014]">
                      <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-[#C4B5FD] transition-colors duration-300">{event.name}</h3>
                      <p className="text-[#9B9B9B] text-xs line-clamp-1">
                        {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 - Handpicked Events You May Like */}
        {handpickedEvents.length > 0 && (
          <div className="px-4 py-6">
            <h2 className="text-white font-bold text-xl mb-1">Handpicked Events You May Like</h2>
            <p className="text-[#9B9B9B] text-xs mb-4">Special experiences in the spotlight</p>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {handpickedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block flex-shrink-0 w-64 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] group"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                >
                  <div className="relative bg-[#0f1014]">
                    {/* Image Section */}
                    <div className="relative h-[240px] w-full overflow-hidden">
                      {event.cover_image ? (
                        <>
                          <img
                            src={getPocketBase().files.getUrl(event, event.cover_image)}
                            alt={event.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            style={{ objectPosition: 'center' }}
                          />
                          {/* Gradient Overlay */}
                          <div 
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%)'
                            }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-32"
                            style={{
                              background: 'linear-gradient(to top, rgba(15, 16, 20, 0.95) 0%, transparent 100%)'
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1b26] to-[#0f1014]">
                          <span className="text-4xl">🎵</span>
                        </div>
                      )}
                      {/* Price overlay */}
                      {event.minPrice && (
                        <div 
                          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur-md"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <span className="text-white font-bold text-sm">₹{event.minPrice.toFixed(0)}</span>
                        </div>
                      )}
                      {/* People count overlay */}
                      {event.interestedCount > 0 && (
                        <div 
                          className="absolute top-3 right-3 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white text-xs">
                            {event.interestedCount >= 1000 
                              ? `${(event.interestedCount / 1000).toFixed(1)}k`
                              : event.interestedCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content Section */}
                    <div className="p-3 bg-[#0f1014]">
                      <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-[#C4B5FD] transition-colors duration-300">{event.name}</h3>
                      <p className="text-[#9B9B9B] text-xs line-clamp-1">
                        {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 - All Experiences in <city> */}
        <div className="px-4 py-6">
          <h2 className="text-white font-bold text-xl mb-1">All Experiences in {selectedCity || 'Your City'}</h2>
          <p className="text-[#9B9B9B] text-xs mb-4">Parties, concerts & trips in one place</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-[18px] bg-[rgba(26,27,38,0.6)] animate-pulse" />
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9B9B9B] mb-2">No events found.</p>
              {selectedCity && filteredEvents.length === 0 && events.length > 0 && (
                <p className="text-[#9B9B9B] text-xs">
                  No events found in {selectedCity}. Try selecting a different city.
                </p>
              )}
              {events.length === 0 && (
                <p className="text-[#9B9B9B] text-xs">
                  No events are currently available.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {allEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] group"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                >
                  <div className="relative bg-[#0f1014]">
                    {/* Image Section */}
                    <div className="relative h-[200px] w-full overflow-hidden">
                      {event.cover_image ? (
                        <>
                          <img
                            src={getPocketBase().files.getUrl(event, event.cover_image)}
                            alt={event.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            style={{ objectPosition: 'center' }}
                          />
                          {/* Gradient Overlay */}
                          <div 
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%)'
                            }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-32"
                            style={{
                              background: 'linear-gradient(to top, rgba(15, 16, 20, 0.95) 0%, transparent 100%)'
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1b26] to-[#0f1014]">
                          <span className="text-3xl">🎵</span>
                        </div>
                      )}
                      {/* Price overlay */}
                      {event.minPrice && (
                        <div 
                          className="absolute top-2 left-2 px-2 py-1 rounded-lg backdrop-blur-md"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <span className="text-white font-bold text-xs">₹{event.minPrice.toFixed(0)}</span>
                        </div>
                      )}
                      {/* People count overlay */}
                      {event.interestedCount > 0 && (
                        <div 
                          className="absolute top-2 right-2 px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white text-[10px]">
                            {event.interestedCount >= 1000 
                              ? `${(event.interestedCount / 1000).toFixed(1)}k`
                              : event.interestedCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content Section */}
                    <div className="p-3 bg-[#0f1014]">
                      <p className="text-[#A855F7] text-xs font-medium mb-1">
                        {formatDate(event.event_date || event.start_date)}
                      </p>
                      <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 leading-tight group-hover:text-[#C4B5FD] transition-colors duration-300">{event.name}</h3>
                      <p className="text-[#9B9B9B] text-xs line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
