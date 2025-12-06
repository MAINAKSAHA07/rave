'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedEvents();
  }, []);

  async function loadFeaturedEvents() {
    try {
      const pb = getPocketBase();
      const now = new Date().toISOString();
      const eventsData = await pb.collection('events').getFullList({
        filter: `status="published" && end_date >= "${now}"`,
        sort: 'start_date',
        expand: 'venue_id,organizer_id',
        limit: 6,
      });
      setEvents(eventsData as any);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="w-full">
        {/* Hero Section */}
        <div className="text-center py-8 mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Welcome to Rave
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            Discover amazing events happening near you
          </p>
          <Link href="/events">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg">
              Browse Events
            </Button>
          </Link>
        </div>

        {/* Featured Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Featured Events</h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-600">No events available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-video overflow-hidden">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image ? getPocketBase().files.getUrl(event, event.cover_image) : ''}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No image</span>
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
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="capitalize">{event.city}</span>
                      <span>
                        {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/events">
            <Card className="bg-purple-50 border-purple-200 hover:bg-purple-100 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-purple-700 mb-2">All Events</h3>
                <p className="text-sm text-purple-600">Browse all events</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/become-organizer">
            <Card className="bg-pink-50 border-pink-200 hover:bg-pink-100 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-pink-700 mb-2">Organize</h3>
                <p className="text-sm text-pink-600">Host your event</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
