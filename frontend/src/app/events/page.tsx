'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

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
  const [filters, setFilters] = useState({
    city: '',
    category: 'All',
    search: '',
    minPrice: '',
    maxPrice: '',
  });

  useEffect(() => {
    loadEvents();
  }, [filters]);

  async function loadEvents() {
    try {
      setLoading(true);
      const pb = getPocketBase();

      // Get current date/time in ISO format for filtering
      const now = new Date().toISOString();
      // Only show published events that haven't ended yet (end_date >= now)
      let filter = `status="published" && end_date >= "${now}"`;

      if (filters.city) {
        filter += ` && city~"${filters.city}"`;
      }

      if (filters.category && filters.category !== 'All') {
        filter += ` && category="${filters.category}"`;
      }

      if (filters.search) {
        filter += ` && (name~"${filters.search}" || description~"${filters.search}")`;
      }

      const eventsData = await pb.collection('events').getFullList({
        filter: filter || undefined,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
      });

      // Filter by price range if specified
      let filteredEvents = eventsData as any[];

      if (filters.minPrice || filters.maxPrice) {
        // Get ticket types for each event to check prices
        const eventsWithPrices = await Promise.all(
          filteredEvents.map(async (event) => {
            try {
              const ticketTypes = await pb.collection('ticket_types').getFullList({
                filter: `event_id="${event.id}"`,
              });

              if (ticketTypes.length === 0) return null;

              const minPrice = Math.min(...ticketTypes.map((tt: any) => tt.final_price_minor));
              const maxPrice = Math.max(...ticketTypes.map((tt: any) => tt.final_price_minor));

              const minFilter = filters.minPrice ? parseFloat(filters.minPrice) * 100 : 0;
              const maxFilter = filters.maxPrice ? parseFloat(filters.maxPrice) * 100 : Infinity;

              if (minPrice >= minFilter && maxPrice <= maxFilter) {
                return event;
              }
              return null;
            } catch (error) {
              return event; // Include event if we can't check prices
            }
          })
        );

        filteredEvents = eventsWithPrices.filter(Boolean) as any[];
      }

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get unique cities from events
  const cities = Array.from(new Set(events.map((e) => e.city).filter(Boolean))).sort();


  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="w-full">
        <h1 className="text-3xl font-black mb-6 text-gray-900 tracking-tight">Discover Events</h1>

        {/* Filters */}
        <div className="mb-6 bg-white/80 backdrop-blur-md border border-white/50 shadow-lg rounded-3xl p-5 sticky top-20 z-40 supports-[backdrop-filter]:bg-white/60">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-700 text-xs font-bold uppercase tracking-wider pl-1">Search</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                <Input
                  id="search"
                  placeholder="Find your next vibe..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-500 rounded-2xl pl-10 h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-700 text-xs font-bold uppercase tracking-wider pl-1">City</Label>
                <Select value={filters.city || 'all'} onValueChange={(value) => setFilters({ ...filters, city: value === 'all' ? '' : value })}>
                  <SelectTrigger id="city" className="bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-500 rounded-2xl h-12">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-700 text-xs font-bold uppercase tracking-wider pl-1">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger id="category" className="bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-500 rounded-2xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="minPrice" className="text-gray-700 text-xs font-bold uppercase tracking-wider pl-1">Min ₹</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-500 rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="maxPrice" className="text-gray-700 text-xs font-bold uppercase tracking-wider pl-1">Max ₹</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-500 rounded-2xl h-12"
                />
              </div>
            </div>
          </div>

          {(filters.city || filters.category !== 'All' || filters.search || filters.minPrice || filters.maxPrice) && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    city: '',
                    category: 'All',
                    search: '',
                    minPrice: '',
                    maxPrice: '',
                  })
                }
                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-3xl border border-gray-200 border-dashed">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-900 font-bold mb-1">No matches found</p>
            <p className="text-gray-500 text-sm mb-4">Try adjusting your filters to find more events.</p>
            <Button variant="outline" onClick={() => setFilters({ city: '', category: 'All', search: '', minPrice: '', maxPrice: '' })} className="border-gray-300 text-gray-700 hover:bg-white rounded-xl">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative bg-white border border-gray-100 rounded-3xl overflow-hidden hover:border-purple-100 hover:shadow-xl transition-all duration-300 shadow-sm"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  {event.cover_image ? (
                    <img
                      src={event.cover_image ? getPocketBase().files.getUrl(event, event.cover_image) : ''}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 font-medium">No image</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-gray-900 uppercase tracking-wider shadow-sm">
                      {event.category}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-16">
                  </div>
                </div>
                <div className="p-5 relative">
                  <h3 className="text-xl font-extrabold mb-2 text-gray-900 leading-tight group-hover:text-purple-600 transition-colors">
                    {event.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 font-medium border-t border-gray-50 pt-3 mt-1">
                    <span className="flex items-center gap-1">
                      📍 {event.city}
                    </span>
                    <span className="text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                      {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
