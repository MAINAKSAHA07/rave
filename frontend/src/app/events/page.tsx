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
    <div className="min-h-screen p-4 pt-4">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">All Events</h1>

        {/* Filters */}
        <Card className="mb-6 bg-white border border-gray-200 shadow-md">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-gray-700">Search</Label>
                <Input
                  id="search"
                  placeholder="Event name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-700">City</Label>
                <Select value={filters.city || 'all'} onValueChange={(value) => setFilters({ ...filters, city: value === 'all' ? '' : value })}>
                  <SelectTrigger id="city" className="bg-white border-gray-300 focus:border-purple-500">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="category" className="text-gray-700">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger id="category" className="bg-white border-gray-300 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPrice" className="text-gray-700">Min Price (₹)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice" className="text-gray-700">Max Price (₹)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    city: '',
                    category: 'All',
                    search: '',
                    minPrice: '',
                    maxPrice: '',
                  })
                }
                className="border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-600 mb-4">No events found matching your filters.</p>
            <Button variant="outline" onClick={() => setFilters({ city: '', category: 'All', search: '', minPrice: '', maxPrice: '' })} className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {event.cover_image ? (
                    <img
                      src={event.cover_image ? getPocketBase().files.getUrl(event, event.cover_image) : ''}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                      {event.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{event.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="capitalize">{event.city}</span>
                    <span>
                      {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {event.expand?.venue_id && (
                    <p className="text-xs text-gray-500">{event.expand.venue_id.name}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
