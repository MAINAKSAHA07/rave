'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Camera } from 'lucide-react';

export default function CheckInPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'idle'; message: string; ticket?: any }>({ status: 'idle', message: '' });
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        async function fetchEvents() {
            const pb = getPocketBase();
            const user = pb.authStore.model;

            if (!user) return;

            try {
                const staffRecord = await pb.collection('organizer_staff').getFirstListItem(`user_id="${user.id}"`);
                const organizerId = staffRecord.organizer_id;

                const records = await pb.collection('events').getFullList({
                    filter: `organizer_id="${organizerId}" && status="published"`,
                    sort: '-start_date',
                });
                setEvents(records);
                if (records.length > 0) {
                    setSelectedEventId(records[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }
        }

        fetchEvents();
    }, []);

    useEffect(() => {
        if (scanning && selectedEventId) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );
            scannerRef.current = scanner;

            scanner.render(onScanSuccess, onScanFailure);

            return () => {
                scanner.clear().catch(console.error);
            };
        }
    }, [scanning, selectedEventId]);

    async function onScanSuccess(decodedText: string, decodedResult: any) {
        if (scanResult.status !== 'idle') return; // Prevent double scan while processing

        // Extract ticket code from URL if needed
        // URL format: https://domain.com/t/TICKET_CODE
        let ticketCode = decodedText;
        if (decodedText.includes('/t/')) {
            ticketCode = decodedText.split('/t/')[1];
        }

        try {
            const pb = getPocketBase();

            // Call backend to check-in
            // We can use the API endpoint or direct PocketBase call if we have logic there
            // But the requirements said "Backend validates...". 
            // I'll use a direct API call to my Node.js backend

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/checkin/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`,
                },
                body: JSON.stringify({
                    ticketCode,
                    eventId: selectedEventId,
                    checkedInBy: pb.authStore.model?.id,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setScanResult({
                    status: 'success',
                    message: 'Check-in Successful!',
                    ticket: data.ticket,
                });
            } else {
                setScanResult({
                    status: 'error',
                    message: data.error || 'Check-in Failed',
                });
            }

            // Pause scanning for a moment
            if (scannerRef.current) {
                scannerRef.current.pause();
                setTimeout(() => {
                    setScanResult({ status: 'idle', message: '' });
                    scannerRef.current?.resume();
                }, 3000);
            }

        } catch (error) {
            console.error('Check-in error:', error);
            setScanResult({
                status: 'error',
                message: 'Network Error',
            });
        }
    }

    function onScanFailure(error: any) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }

    return (
        <div className="min-h-screen p-4 flex items-center justify-center">
            <Card className="max-w-md w-full mx-auto bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-center text-white text-2xl font-bold">Event Check-in</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Select Event</label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select event" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id} className="focus:bg-white/10 focus:text-white">
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!scanning ? (
                        <Button
                            className="w-full h-32 text-lg bg-teal-600 hover:bg-teal-700 text-white border-none shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02]"
                            onClick={() => setScanning(true)}
                            disabled={!selectedEventId}
                        >
                            <Camera className="w-8 h-8 mr-2" />
                            Start Scanner
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-white/20"></div>
                            <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setScanning(false)}>
                                Stop Scanner
                            </Button>
                        </div>
                    )}

                    {scanResult.status !== 'idle' && (
                        <div className={`p-4 rounded-xl text-center border ${scanResult.status === 'success'
                                ? 'bg-green-500/20 text-green-200 border-green-500/40'
                                : 'bg-red-500/20 text-red-200 border-red-500/40'
                            }`}>
                            {scanResult.status === 'success' ? (
                                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                            ) : (
                                <XCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
                            )}
                            <h3 className="text-xl font-bold">{scanResult.message}</h3>
                            {scanResult.ticket && (
                                <div className="mt-2 text-sm text-white/90">
                                    <p>{scanResult.ticket.attendee_name}</p>
                                    <p className="font-mono opacity-80">{scanResult.ticket.ticket_code}</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
