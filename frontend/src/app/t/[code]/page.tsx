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
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Your Ticket</h1>
          <p className="text-gray-300 font-mono tracking-wider">{ticket.ticket_code}</p>
        </div>

        {/* QR Code - Only show for issued or checked_in tickets */}
        {(ticket.status === 'issued' || ticket.status === 'checked_in') ? (
          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-300 shadow-inner">
              <QRCodeSVG value={qrUrl} size={300} />
            </div>
          </div>
        ) : ticket.status === 'pending' ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-3xl mr-2">⏳</span>
              <p className="text-lg font-semibold text-yellow-200">Payment Pending</p>
            </div>
            <p className="text-sm text-yellow-100/80">
              Your ticket will be issued once payment is confirmed. The QR code will be available after payment processing.
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-center">
            <p className="text-sm text-gray-300 mb-2">
              Ticket Status: <span className="font-semibold uppercase text-white">{ticket.status.replace('_', ' ')}</span>
            </p>
            <p className="text-xs text-gray-500">
              QR code is only available for issued tickets.
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-400">Event</p>
            <p className="font-semibold text-white text-xl">{ticket.expand?.event_id?.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Ticket Type</p>
            <p className="font-semibold text-white">
              {ticket.expand?.ticket_type_id?.name}
              {ticket.expand?.ticket_type_id?.ticket_type_category && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({ticket.expand.ticket_type_id.ticket_type_category}
                  {ticket.expand?.table_id && ` - Table ${ticket.expand.table_id.name}`}
                  )
                </span>
              )}
            </p>
          </div>

          {ticket.expand?.seat_id && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-sm text-blue-300 mb-1 font-semibold">💺 Seat Assignment</p>
              <p className="font-semibold text-white">
                {ticket.expand.seat_id.section} - Row {ticket.expand.seat_id.row} - {ticket.expand.seat_id.label}
              </p>
            </div>
          )}

          {ticket.expand?.table_id && (
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
              <p className="text-sm text-teal-300 mb-1 font-semibold">🪑 Table Assignment</p>
              <p className="font-semibold text-white">
                Table: {ticket.expand.table_id.name}
                {ticket.expand.table_id.section && ` (${ticket.expand.table_id.section})`}
                {ticket.expand.table_id.capacity && ` - Capacity: ${ticket.expand.table_id.capacity}`}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-400">Status</p>
            <p className={`font-semibold capitalize ${ticket.status === 'issued' ? 'text-green-400' :
                ticket.status === 'checked_in' ? 'text-blue-400' :
                  ticket.status === 'pending' ? 'text-yellow-400' :
                    'text-gray-400'
              }`}>
              {ticket.status.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

