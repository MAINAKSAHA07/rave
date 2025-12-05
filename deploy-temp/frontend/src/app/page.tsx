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
        // Get current date/time in ISO format for filtering
        const now = new Date().toISOString();
        // Only show published events that haven't ended yet (end_date >= now)
        const events = await pb.collection('events').getList(1, 6, {
          filter: `status="published" && end_date >= "${now}"`,
          sort: 'start_date',
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
      <div className="relative overflow-hidden py-32 sm:py-40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] -z-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-foreground to-primary/50 tracking-tight">
            Discover Amazing Events
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-muted-foreground max-w-2xl mx-auto">
            Book tickets for concerts, festivals, workshops, and more in a seamless, modern experience.
          </p>
          <Link href="/events">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 transition-all hover:scale-105">
              Browse All Events
            </Button>
          </Link>
        </div>
      </div>

      {/* Featured Events */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2">Featured Events</h2>
            <p className="text-muted-foreground">Curated just for you</p>
          </div>
          <Link href="/events" className="hidden md:block">
            <Button variant="ghost" className="text-primary hover:text-primary/80">View All &rarr;</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : featuredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {event.cover_image ? (
                    <img
                      src={(() => {
                        try {
                          return getPocketBase().files.getUrl(event, event.cover_image);
                        } catch (e) {
                          return '';
                        }
                      })()}
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
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary-foreground backdrop-blur-md border border-primary/20">
                      {event.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">{event.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{event.city}</span>
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
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-white/5">
            <p className="text-muted-foreground mb-6 text-lg">No events available yet</p>
            <Link href="/events">
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">View All Events</Button>
            </Link>
          </div>
        )}

        <div className="mt-12 text-center md:hidden">
          <Link href="/events">
            <Button variant="outline" size="lg" className="w-full">
              View All Events
            </Button>
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 mt-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/5" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Want to host your own event?</h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of organizers who use Rave to sell tickets and manage their events effortlessly.
          </p>
          <Link href="/become-organizer">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-white text-lg px-10 py-6 rounded-full shadow-lg shadow-secondary/20 transition-all hover:scale-105">
              Become an Organizer
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

