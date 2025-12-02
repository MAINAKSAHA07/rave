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
      
      let filter = 'status="published"';
      
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
        sort: '-start_date',
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">All Events</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Event name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Select value={filters.city || 'all'} onValueChange={(value) => setFilters({ ...filters, city: value === 'all' ? '' : value })}>
                  <SelectTrigger id="city">
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
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger id="category">
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
              <div>
                <Label htmlFor="minPrice">Min Price (₹)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxPrice">Max Price (₹)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
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
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No events found matching your filters.</p>
            <Button variant="outline" onClick={() => setFilters({ city: '', category: 'All', search: '', minPrice: '', maxPrice: '' })}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                {event.cover_image && (
                  <img
                    src={getPocketBase().files.getUrl(event, event.cover_image)}
                    alt={event.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{event.name}</h3>
                  <p className="text-gray-600 text-sm mb-2 capitalize">
                    {event.category} • {event.city}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.start_date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {event.expand?.venue_id && (
                    <p className="text-xs text-gray-400 mt-1">{event.expand.venue_id.name}</p>
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
