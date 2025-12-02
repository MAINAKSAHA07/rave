'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedEvents() {
      try {
        const pb = getPocketBase();
        const events = await pb.collection('events').getList(1, 6, {
          filter: 'status="published"',
          sort: '-start_date',
          expand: 'venue_id,organizer_id',
        });
        setFeaturedEvents(events.items as any);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedEvents();
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-4">Discover Amazing Events</h1>
          <p className="text-xl mb-8 text-blue-100">
            Book tickets for concerts, festivals, workshops, and more
          </p>
          <Link href="/events">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Browse All Events
            </Button>
          </Link>
        </div>
      </div>

      {/* Featured Events */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Featured Events</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading events...</p>
          </div>
        ) : featuredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
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
                  <p className="text-gray-600 text-sm mb-2">
                    {event.city} • {event.category}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.start_date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No events available yet</p>
            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/events">
            <Button variant="outline" size="lg">
              View All Events
            </Button>
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Want to host your own event?</h2>
          <p className="text-gray-600 mb-6">
            Join thousands of organizers who use Rave to sell tickets
          </p>
          <Link href="/organizer/apply">
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Become an Organizer
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

