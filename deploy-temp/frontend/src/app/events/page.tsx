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
    <div className="min-h-screen p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">All Events</h1>

        {/* Filters */}
        <Card className="mb-8 bg-card/50 backdrop-blur-md border-white/10 shadow-xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-muted-foreground">Search</Label>
                <Input
                  id="search"
                  placeholder="Event name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-muted-foreground">City</Label>
                <Select value={filters.city || 'all'} onValueChange={(value) => setFilters({ ...filters, city: value === 'all' ? '' : value })}>
                  <SelectTrigger id="city" className="bg-background/50 border-white/10 focus:border-primary/50">
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
                <Label htmlFor="category" className="text-muted-foreground">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger id="category" className="bg-background/50 border-white/10 focus:border-primary/50">
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
                <Label htmlFor="minPrice" className="text-muted-foreground">Min Price (₹)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice" className="text-muted-foreground">Max Price (₹)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
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
                className="border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-white/5">
            <p className="text-muted-foreground mb-6 text-lg">No events found matching your filters.</p>
            <Button variant="outline" onClick={() => setFilters({ city: '', category: 'All', search: '', minPrice: '', maxPrice: '' })} className="border-primary/50 text-primary hover:bg-primary/10">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {event.cover_image ? (
                    <img
                      src={getPocketBase().files.getUrl(event, event.cover_image)}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="mb-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary-foreground backdrop-blur-md border border-primary/20 capitalize">
                      {event.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">{event.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
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
                    <p className="text-xs text-gray-400">{event.expand.venue_id.name}</p>
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
