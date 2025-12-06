'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BrandReveal from '@/components/BrandReveal';

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show content after brand reveal animation (15 seconds)
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 15000);

    loadFeaturedEvents();

    return () => clearTimeout(timer);
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
    <div className="min-h-screen">
      {/* Brand Reveal Animation */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-1000 ${showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <BrandReveal />
      </div>

      {/* Main Content */}
      <div className={`min-h-screen p-4 transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full">
          {/* Hero Section */}
          <div className="text-center py-12 mb-12">
            <h1 className="font-heading text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              <span className="text-gray-900">Welcome to </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 animate-gradient-x">
                Powerglide
              </span>
            </h1>
            <p className="text-gray-600 mb-8 text-xl font-medium max-w-md mx-auto leading-relaxed">
              Discover amazing events happening near you. Join the party!
            </p>
            <Link href="/events">
              <Button className="font-heading bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-7 text-xl rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-none">
                Browse Events
              </Button>
            </Link>
          </div>

          {/* Featured Events */}
          <div className="mb-12">
            <h2 className="font-heading text-3xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              <span>🔥</span> Featured Events
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-gray-100/50 animate-pulse border border-white/20" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 backdrop-blur-sm rounded-3xl border border-gray-200/50">
                <p className="text-gray-600">No events available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {events.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group block bg-white/60 backdrop-blur-md border border-white/40 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-video overflow-hidden">
                      {event.cover_image ? (
                        <img
                          src={event.cover_image ? getPocketBase().files.getUrl(event, event.cover_image) : ''}
                          alt={event.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-100/80 text-purple-700 capitalize tracking-wide">
                          {event.category}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl font-bold mb-2 text-gray-900 group-hover:text-purple-700 transition-colors">{event.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-600 font-medium">
                        <span className="capitalize flex items-center gap-1">
                          📍 {event.city}
                        </span>
                        <span className="flex items-center gap-1">
                          📅 {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
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
              <Card className="bg-purple-50/60 backdrop-blur-sm border-purple-100 hover:bg-purple-100/70 transition-all hover:-translate-y-1 duration-300 shadow-sm hover:shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl mb-2">🎟️</div>
                  <h3 className="font-heading font-bold text-purple-900 mb-1">All Events</h3>
                  <p className="text-xs text-purple-700 font-medium">Browse everything</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/become-organizer">
              <Card className="bg-pink-50/60 backdrop-blur-sm border-pink-100 hover:bg-pink-100/70 transition-all hover:-translate-y-1 duration-300 shadow-sm hover:shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl mb-2">✨</div>
                  <h3 className="font-heading font-bold text-pink-900 mb-1">Organize</h3>
                  <p className="text-xs text-pink-700 font-medium">Host your event</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
