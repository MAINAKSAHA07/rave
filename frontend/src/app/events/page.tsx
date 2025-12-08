'use client';

import { useEffect, useState } from 'react';
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
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>('');

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
      console.log(`[EventsPage] Loaded ${eventsWithPrices.length} events`);
      if (selectedCity) {
        const cityEvents = eventsWithPrices.filter((e: any) => {
          const eventCity = (e.city || e.expand?.venue_id?.city || '').toString().trim();
          return eventCity.toLowerCase() === selectedCity.trim().toLowerCase();
        });
        console.log(`[EventsPage] Filtered to ${cityEvents.length} events for city: ${selectedCity}`);
      }
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
    console.log(`[EventsPage] City filter: "${selectedCity}" - Found ${cityFiltered.length} events out of ${events.length} total`);
    if (cityFiltered.length === 0 && events.length > 0) {
      // Log available cities for debugging
      const availableCities = [...new Set(events.map((e: any) => (e.city || e.expand?.venue_id?.city || '').toString().trim()).filter(Boolean))];
      console.log(`[EventsPage] Available cities in events:`, availableCities);
    }
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

  return (
    <div 
      className="min-h-screen pb-20"
      style={{
        background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)',
      }}
    >
      <div className="max-w-[428px] mx-auto min-h-screen">
        {/* Top Navigation Tabs */}
        <div className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedTab('All Events')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
                selectedTab === 'All Events'
                  ? 'text-white'
                  : 'text-[#9B9B9B]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>All Events</span>
              {selectedTab === 'All Events' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CE83FF]" style={{ marginLeft: '12px', marginRight: '12px' }} />
              )}
            </button>
            <button
              onClick={() => setSelectedTab('NYE 2026')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
                selectedTab === 'NYE 2026'
                  ? 'text-white'
                  : 'text-[#9B9B9B]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>NYE 2026</span>
              {selectedTab === 'NYE 2026' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CE83FF]" style={{ marginLeft: '12px', marginRight: '12px' }} />
              )}
            </button>
            <button
              onClick={() => setSelectedTab('Activities')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
                selectedTab === 'Activities'
                  ? 'text-white'
                  : 'text-[#9B9B9B]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Activities</span>
              {selectedTab === 'Activities' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CE83FF]" style={{ marginLeft: '12px', marginRight: '12px' }} />
              )}
            </button>
            <button
              onClick={() => {
                // Filters tab just shows all events (same as All Events)
                setSelectedTab('All Events');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ml-auto text-[#9B9B9B] hover:text-white"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
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
                      ? 'bg-[#CE83FF] text-white'
                      : 'bg-[#1a1a1a] text-[#9B9B9B] border border-white/10'
                  }`}
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
                <div key={i} className="w-64 h-80 rounded-[18px] bg-[#1a1a1a] animate-pulse flex-shrink-0" />
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
                  className="block flex-shrink-0 w-64"
                >
                  <div className="relative rounded-[18px] overflow-hidden mb-2" style={{ aspectRatio: '4/5' }}>
                    {event.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
                        <span className="text-4xl">🎵</span>
                      </div>
                    )}
                    {/* Price overlay */}
                    {event.minPrice && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm">
                        <span className="text-white font-bold text-sm">₹{event.minPrice.toFixed(0)}</span>
                      </div>
                    )}
                    {/* People count overlay */}
                    {event.interestedCount > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white text-xs">
                          {event.interestedCount >= 1000 
                            ? `${(event.interestedCount / 1000).toFixed(1)}k`
                            : event.interestedCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base mb-1 line-clamp-2">{event.name}</h3>
                  <p className="text-[#9B9B9B] text-xs line-clamp-1">
                    {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                  </p>
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
                  className="block flex-shrink-0 w-64"
                >
                  <div className="relative rounded-[18px] overflow-hidden mb-2" style={{ aspectRatio: '4/5' }}>
                    {event.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
                        <span className="text-4xl">🎵</span>
                      </div>
                    )}
                    {/* Price overlay */}
                    {event.minPrice && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm">
                        <span className="text-white font-bold text-sm">₹{event.minPrice.toFixed(0)}</span>
                      </div>
                    )}
                    {/* People count overlay */}
                    {event.interestedCount > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white text-xs">
                          {event.interestedCount >= 1000 
                            ? `${(event.interestedCount / 1000).toFixed(1)}k`
                            : event.interestedCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-base mb-1 line-clamp-2">{event.name}</h3>
                  <p className="text-[#9B9B9B] text-xs line-clamp-1">
                    {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                  </p>
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
                <div key={i} className="aspect-[3/4] rounded-[18px] bg-[#1a1a1a] animate-pulse" />
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
                  className="block"
                >
                  <div className="relative rounded-[18px] overflow-hidden mb-2" style={{ aspectRatio: '3/4' }}>
                    {event.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
                        <span className="text-3xl">🎵</span>
                      </div>
                    )}
                    {/* Price overlay */}
                    {event.minPrice && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm">
                        <span className="text-white font-bold text-xs">₹{event.minPrice.toFixed(0)}</span>
                      </div>
                    )}
                    {/* People count overlay */}
                    {event.interestedCount > 0 && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white text-[10px]">
                          {event.interestedCount >= 1000 
                            ? `${(event.interestedCount / 1000).toFixed(1)}k`
                            : event.interestedCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-1">
                    <p className="text-[#CE83FF] text-xs font-medium mb-1">
                      {formatDate(event.event_date || event.start_date)}
                    </p>
                    <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 leading-tight">{event.name}</h3>
                    <p className="text-[#9B9B9B] text-xs line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.expand?.venue_id?.name || event.city || 'Venue TBA'}
                    </p>
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
