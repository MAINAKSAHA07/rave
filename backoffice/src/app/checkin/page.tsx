'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkinApi } from '@/lib/api';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckInPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStats();
    }
  }, [selectedEventId]);

  async function loadEvents() {
    try {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const pb = getPocketBase();

      // Super admin and admin can see all events
      if (user.role === 'super_admin' || user.role === 'admin') {
        const eventsData = await pb.collection('events').getFullList({
          filter: 'status="published"',
          sort: '-start_date',
        });
        setEvents(eventsData as any);
        return;
      }

      // Get events where user is organizer staff
      const staff = await pb.collection('organizer_staff').getFullList({
        filter: `user_id="${user.id}" && status="active"`,
      });

      const organizerIds = staff.map((s: any) => s.organizer_id);
      if (organizerIds.length === 0) {
        return;
      }

      const eventsData = await pb.collection('events').getFullList({
        filter: `organizer_id.id~"${organizerIds.join('" || organizer_id.id~"')}" && status="published"`,
        sort: '-start_date',
      });

      setEvents(eventsData as any);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  async function loadStats() {
    try {
      const response = await checkinApi.getStats(selectedEventId);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Handle scanner lifecycle
  useEffect(() => {
    if (scanning && !scannerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        scanner
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            async (decodedText) => {
              // Pause scanning to prevent multiple scans
              scanner.pause();
              await handleScan(decodedText);
              // Resume after processing
              scanner.resume();
            },
            (errorMessage) => {
              // Ignore scanning errors
            }
          )
          .catch((err) => {
            console.error('Failed to start scanner:', err);
            alert('Failed to start camera. Please check permissions.');
            setScanning(false);
          });
      }, 100);

      return () => clearTimeout(timer);
    } else if (!scanning && scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
        })
        .catch((err) => {
          console.error('Failed to stop scanner:', err);
        });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  function startScanning() {
    if (!selectedEventId) {
      alert('Please select an event first');
      return;
    }
    setScanning(true);
  }

  function stopScanning() {
    setScanning(false);
  }

  async function handleScan(ticketCode: string) {
    try {
      const user = getCurrentUser();
      if (!user) return;

      const response = await checkinApi.scan(ticketCode, selectedEventId, user.id);
      setLastScanResult({ success: true, data: response.data });
      await loadStats();
    } catch (error: any) {
      setLastScanResult({
        success: false,
        error: error.response?.data?.error || 'Check-in failed',
      });
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Check-In</h1>

        {events.length === 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-yellow-800">
                No events available for check-in. Make sure you have access to organizer events or are logged in as admin.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEventId}
              onValueChange={(value) => {
                setSelectedEventId(value);
                if (scanning) stopScanning();
              }}
              disabled={scanning}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select Event --" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} - {new Date(event.start_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Check-In Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Tickets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
                  <p className="text-sm text-gray-600">Checked In</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.remaining}</p>
                  <p className="text-sm text-gray-600">Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {lastScanResult && (
          <div
            className={`mb-4 p-4 rounded ${lastScanResult.success ? 'bg-green-100' : 'bg-red-100'
              }`}
          >
            {lastScanResult.success ? (
              <div>
                <p className="font-semibold text-green-800">✓ Check-in successful!</p>
                {lastScanResult.data?.ticket && (
                  <p className="text-sm mt-2">
                    {lastScanResult.data.ticket.attendeeName} - {lastScanResult.data.ticket.type}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-red-800">{lastScanResult.error}</p>
            )}
          </div>
        )}

        <div className="mb-6">
          {!scanning ? (
            <Button
              onClick={startScanning}
              disabled={!selectedEventId}
              className="w-full"
              size="lg"
            >
              Start Scanning
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              Stop Scanning
            </Button>
          )}
        </div>

        {scanning && (
          <div id="reader" className="w-full border rounded-lg overflow-hidden"></div>
        )}
      </div>
    </div>
  );
}

