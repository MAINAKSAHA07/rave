'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Input } from '@/components/ui/input';
import BottomNavigation from '@/components/BottomNavigation';

const CATEGORIES = [
  'All',
  'concert',
  'comedy',
  'nightlife',
  'workshop',
  'sports',
  'theatre',
  'festival',
  'other',
];

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const pb = getPocketBase();
      const now = new Date().toISOString();
      let filter = `status="published" && end_date >= "${now}"`;

      if (searchQuery) {
        filter += ` && (name~"${searchQuery}" || description~"${searchQuery}")`;
      }

      const eventsData = await pb.collection('events').getFullList({
        filter: filter || undefined,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
      });

      // Get ticket prices for each event (price without GST for display)
      const eventsWithPrices = await Promise.all(
        eventsData.map(async (event: any) => {
          try {
            const ticketTypes = await pb.collection('ticket_types').getFullList({
              filter: `event_id="${event.id}"`,
            });
            if (ticketTypes.length > 0) {
              const prices = ticketTypes.map((tt: any) => tt.final_price_minor);
              // Calculate price without GST (assuming 18% GST)
              // base_price = final_price / 1.18
              const pricesWithoutGst = prices.map((price: number) => price / 1.18);
              event.minPrice = Math.min(...pricesWithoutGst) / 100;
              event.maxPrice = Math.max(...pricesWithoutGst) / 100;
              event.originalPrice = event.minPrice * 1.5; // Simulate original price for deals
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

  // Filter events for "Event for you" (first 4)
  const eventsForYou = events.slice(0, 4);

  // Filter events for "Special Deal" (events with price differences, simulate deals)
  const specialDeals = events
    .filter((e) => e.originalPrice && e.minPrice < e.originalPrice)
    .slice(0, 4);

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[428px] mx-auto min-h-screen">
        {/* Search Bar */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/30 border-b border-white/10 p-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search Event"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadEvents();
              }}
              className="w-full pl-4 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-xl focus:border-teal-500 focus:ring-0 text-white placeholder:text-gray-400 backdrop-blur-md"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        {/* Event for you Section */}
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Event for you</h2>
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
          ) : eventsForYou.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <p className="text-gray-400">No events found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {eventsForYou.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:bg-white/15 transition-all"
                >
                  <div className="flex">
                    <div className="w-32 h-32 flex-shrink-0">
                      {event.cover_image ? (
                        <img
                          src={getPocketBase().files.getUrl(event, event.cover_image)}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                          <span className="text-teal-400 text-2xl">🎵</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full capitalize">
                          {event.category}
                        </span>
                        <button className="text-red-400 hover:text-red-300 text-lg transition-colors">❤️</button>
                      </div>
                      <h3 className="text-base font-bold text-white mb-1 line-clamp-2">{event.name}</h3>
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">{event.city}</p>
                      <p className="text-teal-400 font-bold text-sm">
                        ₹{event.minPrice ? event.minPrice.toFixed(0) : 'TBD'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Special Deal Section */}
        {specialDeals.length > 0 && (
          <div className="px-4 py-6 bg-white/5 backdrop-blur-sm border-y border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Special Deal</h2>
              <Link href="/events" className="text-teal-400 text-sm font-medium hover:text-teal-300">
                See More
              </Link>
            </div>
            <div className="space-y-4">
              {specialDeals.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:bg-white/15 transition-all"
                >
                  <div className="flex">
                    <div className="w-24 h-24 flex-shrink-0">
                      {event.cover_image ? (
                        <img
                          src={getPocketBase().files.getUrl(event, event.cover_image)}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                          <span className="text-teal-400 text-xl">🎵</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full capitalize">
                          {event.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">{event.name}</h3>
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">{event.city}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs line-through">
                          ₹{event.originalPrice?.toFixed(0)}
                        </span>
                        <span className="text-teal-400 font-bold text-sm">
                          ₹{event.minPrice?.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Events Section */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-bold text-white mb-4">All Events</h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <p className="text-gray-400">No events found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:bg-white/15 transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    {event.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                        <span className="text-teal-400 text-3xl">🎵</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{event.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">
                      {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-teal-400 font-bold text-sm">
                      ₹{event.minPrice ? event.minPrice.toFixed(0) : 'TBD'}
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
