'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Loading from '@/components/Loading';

export default function TicketPage() {
  const params = useParams();
  const ticketCode = params.code as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketCode]);

  async function loadTicket() {
    try {
      // Use backend API for public ticket lookup
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/tickets/by-code/${ticketCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setTicket(null);
          return;
        }
        throw new Error('Failed to load ticket');
      }

      const ticketData = await response.json();
      setTicket(ticketData);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!ticket) {
    return <div className="p-8">Ticket not found</div>;
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';
  const qrUrl = `${frontendUrl}/t/${ticketCode}`;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Ticket</h1>
          <p className="text-gray-600">{ticket.ticket_code}</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-white p-6 rounded border-2 border-dashed">
            <QRCodeSVG value={qrUrl} size={300} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Event</p>
            <p className="font-semibold">{ticket.expand?.event_id?.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Ticket Type</p>
            <p className="font-semibold">{ticket.expand?.ticket_type_id?.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold capitalize">{ticket.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

