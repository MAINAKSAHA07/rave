'use client';

import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  city: string;
  cover_image?: string;
  status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    status: 'published',
  });

  useEffect(() => {
    loadEvents();
  }, [filters]);

  async function loadEvents() {
    try {
      const pb = getPocketBase();
      let filter = `status="${filters.status}"`;
      
      if (filters.city) {
        filter += ` && city="${filters.city}"`;
      }
      if (filters.category) {
        filter += ` && category="${filters.category}"`;
      }

      const records = await pb.collection('events').getList(1, 50, {
        filter,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
      });

      setEvents(records.items as any);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading events...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Browse Events</h1>

        <div className="mb-6 flex gap-4">
          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="border rounded px-4 py-2"
          >
            <option value="">All Cities</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Chennai">Chennai</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border rounded px-4 py-2"
          >
            <option value="">All Categories</option>
            <option value="concert">Concert</option>
            <option value="comedy">Comedy</option>
            <option value="nightlife">Nightlife</option>
            <option value="workshop">Workshop</option>
            <option value="sports">Sports</option>
            <option value="theatre">Theatre</option>
            <option value="festival">Festival</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {event.cover_image && (
                <img
                  src={getPocketBase().files.getUrl(event as any, event.cover_image)}
                  alt={event.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
                <p className="text-gray-600 text-sm mb-2">{event.city} • {event.category}</p>
                <p className="text-sm">
                  {new Date(event.start_date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
}

