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

        {/* QR Code - Only show for issued or checked_in tickets */}
        {(ticket.status === 'issued' || ticket.status === 'checked_in') ? (
          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded border-2 border-dashed">
              <QRCodeSVG value={qrUrl} size={300} />
            </div>
          </div>
        ) : ticket.status === 'pending' ? (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-3xl mr-2">⏳</span>
              <p className="text-lg font-semibold text-yellow-800">Payment Pending</p>
            </div>
            <p className="text-sm text-yellow-700">
              Your ticket will be issued once payment is confirmed. The QR code will be available after payment processing.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Ticket Status: <span className="font-semibold uppercase">{ticket.status.replace('_', ' ')}</span>
            </p>
            <p className="text-xs text-gray-500">
              QR code is only available for issued tickets.
            </p>
          </div>
        )}

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
            <p className={`font-semibold capitalize ${
              ticket.status === 'issued' ? 'text-green-600' :
              ticket.status === 'checked_in' ? 'text-blue-600' :
              ticket.status === 'pending' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {ticket.status.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

