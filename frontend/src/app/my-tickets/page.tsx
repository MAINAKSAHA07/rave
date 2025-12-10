'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Loading from '@/components/Loading';
import BottomNavigation from '@/components/BottomNavigation';

interface Ticket {
  id: string;
  ticket_code: string;
  status: string;
  event_id: string;
  ticket_type_id: string;
  order_id: string;
  seat_id?: string;
  table_id?: string;
  expand?: {
    seat_id?: {
      id: string;
      section: string;
      row: string;
      seat_number: string;
      label: string;
    };
    table_id?: {
      id: string;
      name: string;
      capacity: number;
      section?: string;
    };
    event_id?: any;
    ticket_type_id?: {
      id: string;
      name: string;
      ticket_type_category?: 'GA' | 'TABLE';
    };
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount_minor: number;
  currency: string;
  event_id: string;
  payment_method?: string;
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [events, setEvents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      const ticketsData = await pb.collection('tickets').getFullList({
        filter: `order_id.user_id="${user.id}"`,
        expand: 'order_id,event_id,ticket_type_id,seat_id,table_id',
      });

      setTickets(ticketsData as any);

      // Load orders and events
      const orderIds = [...new Set(ticketsData.map((t: any) => t.order_id))];
      const eventIds = [...new Set(ticketsData.map((t: any) => t.event_id))];

      const ordersMap: Record<string, Order> = {};
      for (const orderId of orderIds) {
        const order = await pb.collection('orders').getOne(String(orderId));
        ordersMap[String(orderId)] = order as any;
      }
      setOrders(ordersMap);

      const eventsMap: Record<string, any> = {};
      for (const eventId of eventIds) {
        try {
          const event = await pb.collection('events').getOne(String(eventId), {
            expand: 'venue_id',
          });
          eventsMap[String(eventId)] = event;
        } catch (error) {
          console.error(`Failed to load event ${eventId}:`, error);
          // Still add event even if expansion fails
          const event = await pb.collection('events').getOne(String(eventId));
          eventsMap[String(eventId)] = event;
        }
      }
      setEvents(eventsMap);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  // Check if an event has ended
  function isEventFinished(event: any): boolean {
    if (!event) return false;
    
    const now = new Date();
    
    // Check end_date first (most accurate)
    if (event.end_date) {
      const endDate = new Date(event.end_date);
      return endDate < now;
    }
    
    // If no end_date, check event_date
    if (event.event_date) {
      const eventDate = new Date(event.event_date);
      // Consider event finished if it's past midnight of the event date
      const eventDateEnd = new Date(eventDate);
      eventDateEnd.setHours(23, 59, 59, 999);
      return eventDateEnd < now;
    }
    
    // If no event_date, check start_date
    if (event.start_date) {
      const startDate = new Date(event.start_date);
      // Consider event finished if start date is more than 24 hours ago
      const startDateEnd = new Date(startDate);
      startDateEnd.setHours(startDateEnd.getHours() + 24);
      return startDateEnd < now;
    }
    
    return false;
  }

  // Detect if device is iOS/iPhone
  function isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  async function addToWallet(ticket: Ticket) {
    try {
      const frontendUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000');
      
      const response = await fetch(`/api/tickets/${ticket.ticket_code}/wallet`);
      
      if (!response.ok) {
        throw new Error('Failed to generate wallet pass');
      }

      // Check if response is a .pkpass file (signed pass)
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/vnd.apple.pkpass')) {
        // Download the .pkpass file directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${ticket.ticket_code}.pkpass`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // If not a signed pass, show instructions
        const passData = await response.json();
        
        // Try to use Web Share API on iOS if available
        if (navigator.share && isIOS()) {
          try {
            await navigator.share({
              title: `Ticket for ${events[ticket.event_id]?.name || 'Event'}`,
              text: `Your ticket: ${ticket.ticket_code}`,
              url: `${frontendUrl}/t/${ticket.ticket_code}`
            });
            return;
          } catch (shareError) {
            // User cancelled or share failed, fall through to PDF
          }
        }
        
        // Fallback: Show message and offer PDF download
        const usePDF = confirm(
          'Apple Wallet requires server-side certificate signing.\n\n' +
          'Would you like to download as PDF instead?\n\n' +
          'OK = Download PDF\nCancel = Cancel'
        );
        
        if (usePDF) {
          downloadTicketAsPDF(ticket);
        }
      }
    } catch (error: any) {
      console.error('Failed to add to wallet:', error);
      const usePDF = confirm('Failed to generate wallet pass.\n\nWould you like to download as PDF instead?');
      if (usePDF) {
        downloadTicketAsPDF(ticket);
      }
    }
  }

  async function downloadTicketAsPDF(ticket: Ticket) {
    // Only allow download for issued or checked_in tickets
    if (ticket.status !== 'issued' && ticket.status !== 'checked_in') {
      alert('Ticket can only be downloaded after payment is confirmed and ticket is issued.');
      return;
    }

    const event = events[ticket.event_id];
    const order = orders[ticket.order_id];
    const frontendUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000');
    const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;

    // Format venue address properly
    const formatVenueAddress = () => {
      const venue = event?.expand?.venue_id;
      if (venue?.address) {
        const addressParts = [venue.address];
        if (venue.city) addressParts.push(venue.city);
        if (venue.state) addressParts.push(venue.state);
        if (venue.pincode) {
          addressParts.push(venue.pincode);
        }
        return addressParts.join(', ');
      }
      return event?.venue_name || event?.city || 'Venue TBD';
    };

    // Create a div with ticket content for PDF generation
    // Position it off-screen but still visible to html2canvas
    const ticketContent = document.createElement('div');
    ticketContent.id = 'ticket-pdf-content';
    ticketContent.style.position = 'absolute';
    ticketContent.style.top = '-9999px';
    ticketContent.style.left = '0';
    ticketContent.style.width = '450px';
    ticketContent.style.height = 'auto';
    ticketContent.style.backgroundColor = '#ffffff';
    ticketContent.innerHTML = `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        border: 3px solid #A855F7;
        border-radius: 20px;
        padding: 30px;
        width: 450px;
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
      ">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #A855F7; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 28px; color: #0f766e; font-weight: bold;">${event?.name || 'Event Ticket'}</h1>
        </div>
        <div style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Name:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${getCurrentUser()?.name || getCurrentUser()?.email || 'Guest'}</span>
          </div>
          ${ticket.expand?.ticket_type_id?.ticket_type_category ? `
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Type:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${ticket.expand.ticket_type_id.ticket_type_category}${ticket.expand?.table_id ? ` - Table ${ticket.expand.table_id.name}${ticket.expand.table_id.section ? ` (${ticket.expand.table_id.section})` : ''}` : ''}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Time:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${event?.start_date ? new Date(event.start_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD'} - ${event?.end_date ? new Date(event.end_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Date:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${event?.event_date || event?.start_date ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Place:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${formatVenueAddress()}</span>
          </div>
          ${ticket.expand?.seat_id ? `
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Seat:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${ticket.expand.seat_id.section} - Row ${ticket.expand.seat_id.row} - ${ticket.expand.seat_id.label}</span>
          </div>
          ` : ''}
          ${ticket.expand?.table_id ? `
          <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-weight: 600; color: #4b5563; font-size: 14px; min-width: 80px;">Table:</span>
            <span style="color: #111827; font-size: 14px; text-align: right; flex: 1; margin-left: 15px;">${ticket.expand.table_id.name}${ticket.expand.table_id.section ? ` (${ticket.expand.table_id.section})` : ''}${ticket.expand.table_id.capacity ? ` - Capacity: ${ticket.expand.table_id.capacity}` : ''}</span>
          </div>
          ` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 12px;">
          <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; font-weight: 500;">Scan this QR code or show this ticket at the event</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #d1d5db; padding: 10px; background: white; border-radius: 8px; display: inline-block;" crossorigin="anonymous" />
        </div>
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          <p style="margin: 8px 0; color: #4b5563; font-size: 13px;"><strong style="color: #111827; font-size: 14px;">Ticket ID: ${ticket.ticket_code}</strong></p>
          <p style="margin: 8px 0; color: #4b5563; font-size: 13px;">Order #${order?.order_number || 'N/A'}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(ticketContent);

    // Wait for images to load before generating PDF
    const qrImage = ticketContent.querySelector('img');
    if (qrImage) {
      await new Promise<void>((resolve, reject) => {
        if (qrImage.complete) {
          resolve();
        } else {
          qrImage.onload = () => resolve();
          qrImage.onerror = () => reject(new Error('QR code image failed to load'));
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('QR code image load timeout')), 5000);
        }
      });
    }

    // Small delay to ensure rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use jsPDF and html2canvas directly for better control
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Get the inner div that contains the actual ticket content
      const ticketInner = ticketContent.querySelector('div') as HTMLElement;
      if (!ticketInner) {
        throw new Error('Ticket content not found');
      }

      // Ensure element is in viewport for html2canvas
      ticketContent.style.position = 'fixed';
      ticketContent.style.top = '0';
      ticketContent.style.left = '0';
      ticketContent.style.zIndex = '9999';

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Capturing element with html2canvas...');
      const canvas = await html2canvas(ticketInner, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: ticketInner.offsetWidth || 450,
        height: ticketInner.offsetHeight || ticketInner.scrollHeight || 800,
        windowWidth: ticketInner.offsetWidth || 450,
        windowHeight: ticketInner.offsetHeight || ticketInner.scrollHeight || 800
      });

      console.log('Canvas created:', canvas.width, 'x', canvas.height);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Save PDF
      pdf.save(`ticket-${ticket.ticket_code}.pdf`);
      
      // Clean up
      if (document.body.contains(ticketContent)) {
        document.body.removeChild(ticketContent);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      if (document.body.contains(ticketContent)) {
        document.body.removeChild(ticketContent);
      }
      alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  function downloadTicket(ticket: Ticket) {
    // Only allow download for issued or checked_in tickets
    if (ticket.status !== 'issued' && ticket.status !== 'checked_in') {
      alert('Ticket can only be downloaded after payment is confirmed and ticket is issued.');
      return;
    }

    // Check if iOS device
    if (isIOS()) {
      // Offer choice: PDF or Apple Wallet
      const choice = confirm(
        'Choose download option:\n\n' +
        'OK = Add to Apple Wallet\n' +
        'Cancel = Download as PDF'
      );
      if (choice) {
        addToWallet(ticket);
      } else {
        downloadTicketAsPDF(ticket);
      }
    } else {
      // For non-iOS, just download PDF
      downloadTicketAsPDF(ticket);
    }
  }

  if (loading) {
    return <Loading />;
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div 
      className="min-h-screen pb-20"
      style={{
        backgroundColor: '#050509',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
      }}
    >
      <div className="max-w-[428px] mx-auto min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 flex items-center gap-4" style={{ background: 'transparent', borderBottom: 'none' }}>
          <button onClick={() => router.back()} className="text-white text-xl hover:text-gray-300 transition-colors">
            ←
          </button>
          <h1 className="text-xl font-bold text-white">My Ticket</h1>
        </div>

        {tickets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl mx-auto mb-4 border border-white/10">
              🎟️
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No tickets yet</h3>
            <p className="text-gray-400 max-w-sm text-sm mb-6">
              You haven't purchased any tickets yet. Browse our events to find your next experience.
            </p>
            <Link href="/events">
              <Button className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)', boxShadow: '0 14px 45px rgba(0,0,0,0.6), 0 0 18px rgba(168,85,247,0.35)' }}>
                Browse Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {tickets
              .filter((ticket) => {
                const event = events[ticket.event_id];
                // Filter out tickets for events that have ended
                return !isEventFinished(event);
              })
              .map((ticket) => {
              const order = orders[ticket.order_id];
              const event = events[ticket.event_id];
              const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;
              const isSelected = selectedTicket === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-lg"
                >
                  {/* Event Banner */}
                  <div className="relative bg-gradient-to-br from-[#A855F7]/60 via-[#3B82F6]/50 to-[#C4B5FD]/50 p-6 backdrop-blur-sm border-b border-white/10">
                    {event?.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                      />
                    ) : null}
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold text-white mb-2 shadow-sm">{event?.name || 'Event'}</h2>
                      <p className="text-[#C4B5FD] text-sm font-medium">
                        {event?.event_date || event?.start_date
                          ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }).toUpperCase()
                          : 'DATE TBD'}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Name</p>
                        <p className="text-sm font-semibold text-white">
                          {getCurrentUser()?.name || getCurrentUser()?.email?.split('@')[0] || 'Guest'}
                        </p>
                      </div>
                      {ticket.expand?.ticket_type_id?.ticket_type_category && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Type</p>
                          <p className="text-sm font-semibold text-white">
                            {ticket.expand.ticket_type_id.ticket_type_category}
                            {ticket.expand?.table_id && (
                              <span className="ml-1 text-xs font-normal text-gray-300">
                                - Table {ticket.expand.table_id.name}
                                {ticket.expand.table_id.section && ` (${ticket.expand.table_id.section})`}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Time</p>
                        <p className="text-sm font-semibold text-white">
                          {event?.start_date
                            ? new Date(event.start_date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            : 'TBD'}{' '}
                          -{' '}
                          {event?.end_date
                            ? new Date(event.end_date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            : 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Date</p>
                        <p className="text-sm font-semibold text-white">
                          {event?.event_date || event?.start_date
                            ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                            : 'TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-1">Place</p>
                      <p className="text-sm font-semibold text-white">
                        {(() => {
                          const venue = event?.expand?.venue_id;
                          if (venue?.address) {
                            const addressParts = [venue.address];
                            if (venue.city) addressParts.push(venue.city);
                            if (venue.state) addressParts.push(venue.state);
                            if (venue.pincode) addressParts.push(`- ${venue.pincode}`);
                            return addressParts.join(', ');
                          }
                          return event?.venue_name || event?.city || 'Venue TBD';
                        })()}
                      </p>
                    </div>

                    {/* Seat/Table Information */}
                    {ticket.expand?.seat_id && (
                      <div className="mb-4 bg-blue-500/10 border border-blue-400/20 rounded-xl p-3">
                        <p className="text-xs text-blue-300 mb-1 font-semibold">💺 Seat Assignment</p>
                        <p className="text-sm font-semibold text-blue-100">
                          {ticket.expand.seat_id.section} - Row {ticket.expand.seat_id.row} - {ticket.expand.seat_id.label}
                        </p>
                      </div>
                    )}
                    {ticket.expand?.table_id && (
                      <div className="mb-4 bg-[#A855F7]/10 border border-[#A855F7]/20 rounded-xl p-3">
                        <p className="text-xs text-[#A855F7] mb-1 font-semibold">🪑 Table Assignment</p>
                        <p className="text-sm font-semibold text-[#A855F7]">
                          Table: {ticket.expand.table_id.name}
                          {ticket.expand.table_id.section && ` (${ticket.expand.table_id.section})`}
                          {ticket.expand.table_id.capacity && ` - Capacity: ${ticket.expand.table_id.capacity}`}
                        </p>
                      </div>
                    )}

                    {/* QR Code Section - Only show for issued or checked_in tickets */}
                    {ticket.status === 'issued' || ticket.status === 'checked_in' ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-center">
                        <p className="text-xs text-gray-300 mb-3">
                          Scan this QR code or show this ticket at the event
                        </p>
                        <div className="flex justify-center mb-3">
                          <div className="bg-white p-3 rounded-xl">
                            <QRCodeSVG value={qrUrl} size={120} />
                          </div>
                        </div>
                        <p className="text-xs font-mono text-gray-300">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                      </div>
                    ) : ticket.status === 'pending' ? (
                      <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-2xl p-4 mb-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-2xl mr-2">⏳</span>
                          <p className="text-sm font-semibold text-yellow-200">Payment Pending</p>
                        </div>
                        <p className="text-xs text-yellow-100/80 mb-2">
                          Your ticket will be issued once payment is confirmed.
                        </p>
                        <p className="text-xs font-mono text-gray-300">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                        {order?.status === 'pending' && order?.payment_method === 'cash' && (
                          <p className="text-xs text-yellow-200/60 mt-2">
                            Waiting for cash payment confirmation at venue
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 mb-4 text-center">
                        <p className="text-xs text-gray-400 mb-2">
                          Ticket Status: <span className="font-semibold uppercase text-white">{ticket.status.replace('_', ' ')}</span>
                        </p>
                        <p className="text-xs font-mono text-gray-500">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                      </div>
                    )}

                    {/* Download Button - Only show for issued or checked_in tickets */}
                    {(ticket.status === 'issued' || ticket.status === 'checked_in') && (
                      <Button
                        onClick={() => downloadTicket(ticket)}
                        className="w-full text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)', boxShadow: '0 14px 45px rgba(0,0,0,0.6), 0 0 18px rgba(168,85,247,0.35)' }}
                      >
                        <span>📥</span>
                        Download Ticket
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
