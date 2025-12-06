'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { ordersApi, seatsApi, seatReservationsApi, tablesApi, tableReservationsApi } from '@/lib/api';
import { useNotificationHelpers } from '@/lib/notifications';
import { useCart } from '@/contexts/CartContext';
import FloorPlanView from '@/components/FloorPlanView';
import TableFloorPlanView from '@/components/TableFloorPlanView';
import Loading from '@/components/Loading';
import BottomNavigation from '@/components/BottomNavigation';

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  city: string;
  cover_image?: string;
  event_date?: string;
  venue_id: string;
  organizer_id: string;
  about?: string;
  overview?: string;
  things_to_carry?: string;
  inclusions?: string;
  terms_and_conditions?: string;
  venue_details?: string;
  organizer_info?: string;
  tags?: string | string[];
  expand?: {
    venue_id?: {
      id: string;
      name: string;
      layout_type: 'GA' | 'SEATED' | 'GA_TABLE';
      address?: string;
      city?: string;
      layout_image?: string;
      [key: string]: any; // Allow additional properties
    };
    organizer_id?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      [key: string]: any; // Allow additional properties
    };
  };
}

interface TicketType {
  id: string;
  name: string;
  description: string;
  final_price_minor: number;
  currency: string;
  remaining_quantity: number;
  max_per_order: number;
  ticket_type_category?: 'GA' | 'TABLE';
  table_ids?: string | string[];
}

interface Seat {
  id: string;
  section: string;
  row: string;
  seat_number: string;
  label: string;
  available: boolean;
  reserved?: boolean;
  sold?: boolean;
  position_x?: number;
  position_y?: number;
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } = useNotificationHelpers();
  const { addToCart } = useCart();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({}); // ticketTypeId -> seatIds[]
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [isSeated, setIsSeated] = useState(false);
  const [isGATable, setIsGATable] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState<Record<string, boolean>>({});
  const [seatViewMode, setSeatViewMode] = useState<Record<string, 'list' | 'map'>>({}); // 'list' or 'map'
  const [reservedSeats, setReservedSeats] = useState<Set<string>>(new Set());
  const [reservedTables, setReservedTables] = useState<Set<string>>(new Set());
  const [reservationTimer, setReservationTimer] = useState<NodeJS.Timeout | null>(null);
  const [tableReservationTimer, setTableReservationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Table selection state
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({}); // ticketTypeId -> tableIds[]
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [showTableSelection, setShowTableSelection] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const reservationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const pb = getPocketBase();
      console.log('[Event] Loading event:', eventId);
      const eventData = await pb.collection('events').getOne(eventId, {
        expand: 'venue_id,organizer_id',
      });
      setEvent(eventData as any);
      console.log('[Event] Event loaded:', {
        id: eventData.id,
        name: eventData.name,
        venue_id: eventData.venue_id,
        organizer_id: eventData.organizer_id,
        expanded_venue: eventData.expand?.venue_id ? 'present' : 'missing',
        expanded_organizer: eventData.expand?.organizer_id ? 'present' : 'missing',
      });

      try {
        // Try to get ticket types with explicit field selection
        // Note: PocketBase may filter fields based on collection views/permissions
        const ticketTypesData = await pb.collection('ticket_types').getFullList({
          filter: `event_id="${eventId}"`,
        });
        
        // Log raw data to see what we're getting
        console.log('[Event] Raw ticket types data:', ticketTypesData);
        if (ticketTypesData.length > 0) {
          console.log('[Event] First ticket type raw keys:', Object.keys(ticketTypesData[0]));
          console.log('[Event] First ticket type raw data:', ticketTypesData[0]);
        }
        
        setTicketTypes(ticketTypesData as any);
        console.log('Loaded ticket types:', ticketTypesData.length);
        // Debug: Log ticket type details
        ticketTypesData.forEach((tt: any) => {
          console.log(`[TicketType] ${tt.name}:`, {
            id: tt.id,
            ticket_type_category: tt.ticket_type_category,
            has_table_ids: !!tt.table_ids,
            table_ids: tt.table_ids ? (typeof tt.table_ids === 'string' ? JSON.parse(tt.table_ids) : tt.table_ids) : tt.table_ids,
            allKeys: Object.keys(tt),
          });
        });
      } catch (ticketError) {
        console.error('Failed to load ticket types:', ticketError);
        setTicketTypes([]);
      }

      // Check if venue is SEATED and load available seats
      let venue = eventData.expand?.venue_id;
      if (!venue && eventData.venue_id) {
        console.log('[Event] Venue not expanded, fetching manually:', eventData.venue_id);
        try {
          venue = await pb.collection('venues').getOne(eventData.venue_id);
          console.log('[Event] Venue fetched successfully:', venue?.name);
        } catch (venueError: any) {
          console.error('[Event] Failed to load venue:', {
            venue_id: eventData.venue_id,
            error: venueError.message,
            status: venueError.status || venueError.response?.status,
          });
          // Venue might not exist or user might not have access - continue without venue data
          venue = null;
        }
      } else if (venue) {
        console.log('[Event] Venue from expansion:', venue.name);
      }
      
      // Only proceed with seat/table loading if we have venue data
      if (venue) {
        if (venue.layout_type === 'SEATED') {
          setIsSeated(true);
          await loadSeats();
        } else if (venue.layout_type === 'GA_TABLE') {
          setIsGATable(true);
          await loadTables();
        }
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTicketChange(ticketTypeId: string, quantity: number) {
    setSelectedTickets({ ...selectedTickets, [ticketTypeId]: quantity });

    // For seated events, clear seat selection if quantity is reduced
    if (isSeated && selectedSeats[ticketTypeId]) {
      const currentSeats = selectedSeats[ticketTypeId] || [];
      if (quantity < currentSeats.length) {
        setSelectedSeats({
          ...selectedSeats,
          [ticketTypeId]: currentSeats.slice(0, quantity),
        });
      }
    }
    
    // For GA_TABLE events, clear table selection if quantity is reduced to 0
    if (isGATable && selectedTables[ticketTypeId] && quantity === 0) {
      setSelectedTables({
        ...selectedTables,
        [ticketTypeId]: [],
      });
    }
  }

  async function loadSeats() {
    try {
      const seatsResponse = await seatsApi.getAvailableSeats(eventId);
      setAvailableSeats(seatsResponse.data.seats || []);

      // Load reserved seats
      const user = getPocketBase().authStore.model;
      if (user) {
        const reservedResponse = await seatReservationsApi.getReserved(eventId, user.id);
        setReservedSeats(new Set((reservedResponse.data as any)?.reserved || []));
      }
    } catch (error) {
      console.error('Failed to load seats:', error);
    }
  }

  async function loadTables() {
    try {
      console.log('[Event] ===== Loading tables for event:', eventId, '=====');
      const tablesResponse = await tablesApi.getAvailableTables(eventId);
      console.log('[Event] Tables response received:', tablesResponse);
      console.log('[Event] Tables response.data:', tablesResponse.data);
      console.log('[Event] Tables response.data.tables:', tablesResponse.data?.tables);
      const tables = tablesResponse.data.tables || [];
      console.log('[Event] Extracted tables array length:', tables.length);
      if (tables.length > 0) {
        console.log('[Event] ✓ First table:', tables[0]);
        console.log('[Event] ✓ All table IDs:', tables.map((t: any) => t.id));
      } else {
        console.warn('[Event] ⚠️ No tables loaded! availableTables will be empty.');
      }
      setAvailableTables(tables);
      console.log('[Event] ===== Finished loading tables =====');

      // Load reserved tables
      const user = getPocketBase().authStore.model;
      if (user) {
        const reservedResponse = await tableReservationsApi.getReserved(eventId, user.id);
        setReservedTables(new Set((reservedResponse.data as any)?.reserved || []));
      }
    } catch (error) {
      console.error('[Event] Failed to load tables:', error);
      console.error('[Event] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  async function handleTableToggle(ticketTypeId: string, tableId: string) {
    const currentTables = selectedTables[ticketTypeId] || [];
    const quantity = selectedTickets[ticketTypeId] || 0;
    const table = availableTables.find(t => t.id === tableId);
    const user = getPocketBase().authStore.model;

    if (!table) return;

    if (!user) {
      alert('Please login to select tables');
      return;
    }

    if (currentTables.includes(tableId)) {
      // Deselect table - release reservation
      const newTables = currentTables.filter((id) => id !== tableId);
      setSelectedTables({
        ...selectedTables,
        [ticketTypeId]: newTables,
      });

      // Release reservation
      try {
        await tableReservationsApi.release([tableId]);
        setReservedTables((prev) => {
          const newSet = new Set(prev);
          newSet.delete(tableId);
          return newSet;
        });
      } catch (error) {
        console.error('Failed to release table reservation:', error);
      }
    } else {
      // Select table (multiple tables allowed based on quantity)
      if (quantity > 0) {
        // Check if we've already selected the maximum number of tables
        if (currentTables.length >= quantity) {
          alert(`You can only select ${quantity} table(s) for ${quantity} ticket(s). Please deselect a table first.`);
          return;
        }

        // Check if table is available
        if (table.sold) {
          alert('This table is already sold');
          return;
        }

        // Check if table is reserved by another user
        if (reservedTables.has(tableId) && !currentTables.includes(tableId)) {
          alert('This table is currently reserved by another user. Please try another table.');
          return;
        }

        // Reserve the table
        try {
          const reserveResponse = await tableReservationsApi.reserve([tableId], user.id, eventId);
          console.log('[Event] Reserve response:', reserveResponse);

          // Check for conflicts
          // Note: reserveResponse is already the data (from response.data), not wrapped in .data
          const conflicts = reserveResponse.conflicts || reserveResponse.data?.conflicts || [];
          const reserved = reserveResponse.reserved || reserveResponse.data?.reserved || [];
          
          if (conflicts.length > 0) {
            alert(`This table was just selected by another user. Please choose a different table.`);
            // Refresh table availability
            await loadTables();
            return;
          }

          if (reserved.includes(tableId)) {
            setSelectedTables({
              ...selectedTables,
              [ticketTypeId]: [...currentTables, tableId], // Add to existing tables
            });

            setReservedTables((prev) => {
              const newSet = new Set(prev);
              newSet.add(tableId);
              return newSet;
            });

            // Set timeout to release reservation after 10 minutes
            if (tableReservationTimer) {
              clearTimeout(tableReservationTimer);
            }
            setTableReservationTimer(setTimeout(() => {
              tableReservationsApi.release([tableId]).catch(console.error);
              setReservedTables((prev) => {
                const newSet = new Set(prev);
                newSet.delete(tableId);
                return newSet;
              });
              setSelectedTables((prev) => {
                const newTables = { ...prev };
                if (newTables[ticketTypeId]) {
                  newTables[ticketTypeId] = newTables[ticketTypeId].filter((id) => id !== tableId);
                }
                return newTables;
              });
              alert('Your table reservation has expired. Please select a table again.');
            }, 10 * 60 * 1000)); // 10 minutes
          } else {
            alert('Failed to reserve table. Please try again.');
          }
        } catch (error: any) {
          console.error('Failed to reserve table:', error);
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          
          // Check if error response has conflicts
          const errorConflicts = error.response?.data?.conflicts || [];
          if (errorConflicts.length > 0) {
            alert('This table was just selected by another user. Please choose a different table.');
          } else {
            alert(`Error: ${error.message || 'Failed to reserve table'}`);
          }
          // Refresh table availability
          await loadTables();
        }
      } else {
        alert('Please select ticket quantity first');
      }
    }
  }

  async function handleSeatToggle(ticketTypeId: string, seatId: string) {
    const currentSeats = selectedSeats[ticketTypeId] || [];
    const quantity = selectedTickets[ticketTypeId] || 0;
    const user = getPocketBase().authStore.model;

    if (!user) {
      alert('Please login to select seats');
      return;
    }

    if (currentSeats.includes(seatId)) {
      // Deselect seat - release reservation
      const newSeats = currentSeats.filter((id) => id !== seatId);
      setSelectedSeats({
        ...selectedSeats,
        [ticketTypeId]: newSeats,
      });

      // Release reservation
      try {
        await seatReservationsApi.release([seatId]);
        setReservedSeats((prev) => {
          const newSet = new Set(prev);
          newSet.delete(seatId);
          return newSet;
        });
      } catch (error) {
        console.error('Failed to release seat reservation:', error);
      }
    } else {
      // Select seat (if not at limit)
      if (currentSeats.length < quantity) {
        // Reserve the seat
        try {
          const reserveResponse = await seatReservationsApi.reserve([seatId], user.id, eventId);

          if (reserveResponse.data.reserved.includes(seatId)) {
            setSelectedSeats({
              ...selectedSeats,
              [ticketTypeId]: [...currentSeats, seatId],
            });
            setReservedSeats((prev) => new Set([...prev, seatId]));

            // Set timeout to release reservation after 10 minutes
            if (reservationTimeoutRef.current) {
              clearTimeout(reservationTimeoutRef.current);
            }
            reservationTimeoutRef.current = setTimeout(() => {
              seatReservationsApi.release([seatId]).catch(console.error);
              setReservedSeats((prev) => {
                const newSet = new Set(prev);
                newSet.delete(seatId);
                return newSet;
              });
              setSelectedSeats((prev) => ({
                ...prev,
                [ticketTypeId]: (prev[ticketTypeId] || []).filter((id) => id !== seatId),
              }));
              alert('Your seat reservation has expired. Please select seats again.');
            }, 10 * 60 * 1000); // 10 minutes
          } else {
            alert('This seat is no longer available. Please select another seat.');
            await loadSeats(); // Refresh seat availability
          }
        } catch (error: any) {
          console.error('Failed to reserve seat:', error);
          alert(`Failed to reserve seat: ${error.response?.data?.error || error.message || 'Unknown error'}`);
          await loadSeats(); // Refresh seat availability
        }
      } else {
        alert(`You can only select ${quantity} seat(s) for this ticket type`);
      }
    }
  }

  // Poll for reserved seats updates
  useEffect(() => {
    if (!isSeated) return;

    const interval = setInterval(async () => {
      try {
        const user = getPocketBase().authStore.model;
        if (user) {
          const reservedResponse = await seatReservationsApi.getReserved(eventId, user.id);
          setReservedSeats(new Set((reservedResponse.data as any)?.reserved || []));
        }
      } catch (error) {
        console.error('Failed to check reserved seats:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isSeated, eventId]);

  // Periodically refresh table reservations for GA_TABLE events
  useEffect(() => {
    if (!isGATable || !eventId) return;

    const user = getPocketBase().authStore.model;
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const reservedResponse = await tableReservationsApi.getReserved(eventId, user.id);
        setReservedTables(new Set((reservedResponse.data as any)?.reserved || []));
      } catch (error) {
        console.error('Failed to refresh reserved tables:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isGATable, eventId]);

  // Cleanup reservations on unmount or page navigation
  useEffect(() => {
    return () => {
      if (reservationTimeoutRef.current) {
        clearTimeout(reservationTimeoutRef.current);
      }
      if (tableReservationTimer) {
        clearTimeout(tableReservationTimer);
      }
      // Release all reservations when component unmounts
      const allSelectedSeatIds = Object.values(selectedSeats).flat();
      if (allSelectedSeatIds.length > 0) {
        seatReservationsApi.release(allSelectedSeatIds).catch(console.error);
      }

      const allSelectedTableIds = Object.values(selectedTables).flat();
      if (allSelectedTableIds.length > 0) {
        tableReservationsApi.release(allSelectedTableIds).catch(console.error);
      }
    };
  }, [selectedSeats, selectedTables, tableReservationTimer]);

  async function handleAddToCart(ticketTypeId: string) {
    if (!event) {
      notifyError('Event not loaded');
      return;
    }

    const quantity = selectedTickets[ticketTypeId] || 0;
    if (quantity === 0) {
      notifyError('Please select at least one ticket');
      return;
    }

    const ticketType = ticketTypes.find(tt => tt.id === ticketTypeId);
    if (!ticketType) {
      notifyError('Ticket type not found');
      return;
    }

    // Validate seat selection for seated events
    if (isSeated) {
      const selectedSeatIds = selectedSeats[ticketTypeId] || [];
      if (selectedSeatIds.length !== quantity) {
        notifyError(`Please select exactly ${quantity} seat(s) for this ticket type`);
        return;
      }
    }

    // Validate table selection for TABLE category tickets
    if (isGATable && ticketType.ticket_type_category === 'TABLE') {
      const selectedTableIds = selectedTables[ticketTypeId] || [];
      if (selectedTableIds.length === 0) {
        notifyError(`Please select at least one table for ${ticketType.name}`);
        return;
      }
      if (selectedTableIds.length !== quantity) {
        notifyError(`Please select exactly ${quantity} table(s) for ${ticketType.name}. Currently selected: ${selectedTableIds.length}`);
        return;
      }
    }

    // Add to cart
    addToCart({
      eventId: eventId,
      eventName: event.name,
      ticketTypeId: ticketTypeId,
      ticketTypeName: ticketType.name,
      quantity: quantity,
      price: ticketType.final_price_minor,
      currency: ticketType.currency,
      ticketTypeCategory: ticketType.ticket_type_category,
      selectedSeats: isSeated ? (selectedSeats[ticketTypeId] || []) : undefined,
      selectedTables: isGATable ? (selectedTables[ticketTypeId] || []) : undefined,
    });

    notifySuccess(`${quantity} ${ticketType.name} ticket(s) added to cart`);
    
    // Clear selections for this ticket type
    setSelectedTickets({ ...selectedTickets, [ticketTypeId]: 0 });
    if (isSeated) {
      const seatIds = selectedSeats[ticketTypeId] || [];
      if (seatIds.length > 0) {
        try {
          await seatReservationsApi.release(seatIds);
          setReservedSeats((prev) => {
            const newSet = new Set(prev);
            seatIds.forEach((id) => newSet.delete(id));
            return newSet;
          });
        } catch (error) {
          console.error('Failed to release seat reservations:', error);
        }
      }
      setSelectedSeats({ ...selectedSeats, [ticketTypeId]: [] });
    }
    if (isGATable) {
      const tableIds = selectedTables[ticketTypeId] || [];
      if (tableIds.length > 0) {
        try {
          await tableReservationsApi.release(tableIds);
          setReservedTables((prev) => {
            const newSet = new Set(prev);
            tableIds.forEach((id) => newSet.delete(id));
            return newSet;
          });
        } catch (error) {
          console.error('Failed to release table reservations:', error);
        }
      }
      setSelectedTables({ ...selectedTables, [ticketTypeId]: [] });
    }

    // Navigate to cart
    router.push('/cart');
  }


  if (loading) {
    return <Loading />;
  }

  if (!event) {
    return <div className="p-8">Event not found</div>;
  }

  return (
    <>

      <div className="min-h-screen pb-20 bg-gray-50">
        <div className="max-w-[428px] mx-auto bg-white min-h-screen">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 p-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="text-gray-700 text-xl">
              ←
            </button>
            <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">{event.name}</h1>
            <button className="text-red-500 text-xl">❤️</button>
          </div>

          {/* Cover Image */}
          {event.cover_image && (
            <div className="relative w-full h-64 overflow-hidden">
              <img
                src={event.cover_image ? getPocketBase().files.getUrl(event as any, event.cover_image) : ''}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-teal-500 text-white rounded-full text-xs font-semibold capitalize">
                    {event.category}
                  </span>
                  <span className="text-white text-xs">📍 {event.city}</span>
                </div>
                <h2 className="text-white font-bold text-xl mb-1">{event.name}</h2>
                <p className="text-white text-sm">
                  {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="p-4 space-y-6">

          {event.description && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Description</h2>
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {event.about && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">About the Event</h2>
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.about}</p>
            </div>
          )}

          {event.overview && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Overview</h2>
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.overview}</p>
            </div>
          )}

          {event.things_to_carry && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Things to Carry</h2>
              <div className="text-gray-700 text-sm space-y-2">
                {event.things_to_carry.split('\n').map((item: string, idx: number) => (
                  item.trim() && (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span>{item.trim()}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {event.inclusions && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Inclusions</h2>
              <div className="text-gray-700 text-sm space-y-2">
                {event.inclusions.split('\n').map((item: string, idx: number) => (
                  item.trim() && (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">✓</span>
                      <span>{item.trim()}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {event.terms_and_conditions && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Terms & Conditions</h2>
              <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.terms_and_conditions}</p>
            </div>
          )}

          {event.expand?.venue_id && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Venue Details</h2>
              <div className="text-gray-700 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-teal-600 font-semibold">📍</span>
                  <div>
                    <p className="font-semibold">{event.expand.venue_id.name}</p>
                    {event.expand.venue_id.address && (
                      <p className="text-gray-600">{event.expand.venue_id.address}</p>
                    )}
                    {event.expand.venue_id.city && (
                      <p className="text-gray-600">{event.expand.venue_id.city}</p>
                    )}
                  </div>
                </div>
              </div>
              {event.venue_details && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.venue_details}</p>
                </div>
              )}
            </div>
          )}

          {event.expand?.organizer_id && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Organizer Information</h2>
              <div className="text-gray-700 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-teal-600 font-semibold">👤</span>
                  <div>
                    <p className="font-semibold">{event.expand.organizer_id.name}</p>
                    {event.expand.organizer_id.email && (
                      <p className="text-gray-600">✉️ {event.expand.organizer_id.email}</p>
                    )}
                    {event.expand.organizer_id.phone && (
                      <p className="text-gray-600">📞 {event.expand.organizer_id.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              {event.organizer_info && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">{event.organizer_info}</p>
                </div>
              )}
            </div>
          )}

          {event.tags && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-900">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(event.tags) ? event.tags : typeof event.tags === 'string' ? (() => {
                  try {
                    return JSON.parse(event.tags);
                  } catch {
                    return event.tags.split(',').map((t: string) => t.trim());
                  }
                })() : []).map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Tickets</h2>
            {ticketTypes.length === 0 ? (
              <div className="border border-gray-200 rounded-xl p-6 text-center bg-gray-50">
                <p className="text-gray-600 mb-2">No tickets available for this event yet.</p>
                <p className="text-xs text-gray-500">Please check back later or contact the organizer.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ticketTypes.map((tt) => (
                  <div key={tt.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-teal-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base">{tt.name}</h3>
                        {tt.description && <p className="text-sm text-gray-700 mt-1">{tt.description}</p>}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-teal-600">
                          ₹{((tt.final_price_minor / 1.18) / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-700 font-medium">+ GST</p>
                        <p className="text-sm text-gray-700 mt-1">
                          {tt.remaining_quantity} available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-medium text-gray-900">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleTicketChange(tt.id, Math.max(0, (selectedTickets[tt.id] || 0) - 1))
                          }
                          className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          disabled={(selectedTickets[tt.id] || 0) === 0}
                        >
                          −
                        </button>
                        <span className="text-lg font-semibold w-8 text-center">{selectedTickets[tt.id] || 0}</span>
                        <button
                          onClick={() =>
                            handleTicketChange(
                              tt.id,
                              Math.min(tt.remaining_quantity, (selectedTickets[tt.id] || 0) + 1)
                            )
                          }
                          className="w-10 h-10 rounded-full border-2 border-teal-500 bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          disabled={
                            (selectedTickets[tt.id] || 0) >= tt.remaining_quantity ||
                            (selectedTickets[tt.id] || 0) >= tt.max_per_order
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Seat Selection for Seated Events */}
                    {isSeated && (selectedTickets[tt.id] || 0) > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <button
                            onClick={() => setShowSeatSelection({ ...showSeatSelection, [tt.id]: !showSeatSelection[tt.id] })}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            {showSeatSelection[tt.id] ? 'Hide Seat Selection' : 'Select Seats'}
                          </button>
                          {showSeatSelection[tt.id] && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSeatViewMode({ ...seatViewMode, [tt.id]: 'list' })}
                                className={`px-3 py-1 text-xs rounded-lg border-2 transition-all ${
                                  (seatViewMode[tt.id] || 'list') === 'list'
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                List View
                              </button>
                              <button
                                onClick={() => setSeatViewMode({ ...seatViewMode, [tt.id]: 'map' })}
                                className={`px-3 py-1 text-xs rounded-lg border-2 transition-all ${
                                  seatViewMode[tt.id] === 'map'
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                Map View
                              </button>
                            </div>
                          )}
                        </div>
                        {showSeatSelection[tt.id] && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Select {selectedTickets[tt.id]} seat(s). Selected: {(selectedSeats[tt.id] || []).length}
                            </p>
                            
                            {/* Map View */}
                            {(seatViewMode[tt.id] || 'list') === 'map' ? (
                              <FloorPlanView
                                seats={availableSeats}
                                selectedSeatIds={selectedSeats[tt.id] || []}
                                reservedSeatIds={reservedSeats}
                                onSeatClick={(seatId) => handleSeatToggle(tt.id, seatId)}
                                maxSelections={selectedTickets[tt.id] || 0}
                                ticketTypeId={tt.id}
                                floorPlanImageUrl={event.expand?.venue_id?.layout_image ? getPocketBase().files.getUrl(event.expand.venue_id as any, (event.expand.venue_id as any).layout_image) : undefined}
                              />
                            ) : (
                              /* List View */
                              <div className="max-h-64 overflow-y-auto border rounded p-3">
                                {availableSeats.length === 0 ? (
                                  <p className="text-sm text-gray-500">Loading seats...</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {availableSeats.map((seat) => {
                                      const isSelected = (selectedSeats[tt.id] || []).includes(seat.id);
                                      const isReserved = reservedSeats.has(seat.id) && !isSelected;
                                      const isUnavailable = !seat.available || seat.sold || isReserved;

                                      return (
                                        <button
                                          key={seat.id}
                                          onClick={() => handleSeatToggle(tt.id, seat.id)}
                                          disabled={isUnavailable}
                                          className={`px-2 py-1 text-xs rounded-lg transition-all ${isSelected
                                            ? 'bg-teal-600 text-white border-2 border-teal-700'
                                            : isReserved
                                              ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                                              : seat.available && !seat.sold
                                                ? 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                                                : 'bg-red-100 text-gray-400 border-2 border-red-300 cursor-not-allowed'
                                            }`}
                                          title={
                                            isSelected
                                              ? `Selected: ${seat.section} - Row ${seat.row} - ${seat.label}`
                                              : isReserved
                                                ? `Reserved: ${seat.section} - Row ${seat.row} - ${seat.label}`
                                                : seat.sold
                                                  ? 'Sold'
                                                  : `${seat.section} - Row ${seat.row} - ${seat.label}`
                                          }
                                        >
                                          💺 {seat.label}
                                          {isReserved && <span className="ml-1 text-xs">⏱️</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table Selection for GA_TABLE Events - Only for TABLE category ticket types */}
                    {/* Show warning if GA_TABLE event but ticket type doesn't have category set */}
                    {isGATable && !tt.ticket_type_category && (selectedTickets[tt.id] || 0) > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            ⚠️ This ticket type needs to be configured. Please contact the organizer to set up table selection for this ticket type.
                          </p>
                        </div>
                      </div>
                    )}
                    {isGATable && tt.ticket_type_category === 'TABLE' && (selectedTickets[tt.id] || 0) > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <button
                            onClick={() => setShowTableSelection({ ...showTableSelection, [tt.id]: !showTableSelection[tt.id] })}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            {showTableSelection[tt.id] ? 'Hide Table Selection' : 'Select Table'}
                          </button>
                        </div>
                        {showTableSelection[tt.id] && (() => {
                          // Filter tables based on ticket type's table_ids
                          let filteredTables: any[] = [];
                          if (!tt.table_ids) {
                            console.warn(`[TableSelection] Ticket type ${tt.id} has no table_ids`);
                          } else {
                            let allowedTableIds: string[] = [];
                            try {
                              allowedTableIds = typeof tt.table_ids === 'string' 
                                ? JSON.parse(tt.table_ids) 
                                : tt.table_ids;
                              if (!Array.isArray(allowedTableIds)) {
                                console.warn(`[TableSelection] Invalid table_ids format for ticket type ${tt.id}`);
                              } else {
                                filteredTables = availableTables.filter(table => allowedTableIds.includes(table.id));
                                console.log(`[TableSelection] Filtered ${filteredTables.length} tables from ${availableTables.length} available for ticket type ${tt.id}`);
                              }
                            } catch (error) {
                              console.error(`[TableSelection] Failed to parse table_ids for ticket type ${tt.id}:`, error);
                            }
                          }

                          return (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700 mb-2 font-medium">
                                Select {selectedTickets[tt.id]} table(s) for {selectedTickets[tt.id]} ticket(s). Selected: {(selectedTables[tt.id] || []).length} of {selectedTickets[tt.id]}
                              </p>
                              
                              {filteredTables.length === 0 ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                  <p className="text-sm text-yellow-800">
                                    ⚠️ No tables available for this ticket type. Please contact the organizer or select a different ticket type.
                                  </p>
                                </div>
                              ) : (
                                /* Map View Only */
                                <TableFloorPlanView
                                  tables={filteredTables}
                                  selectedTableIds={selectedTables[tt.id] || []}
                                  reservedTableIds={reservedTables}
                                  onTableClick={(tableId) => handleTableToggle(tt.id, tableId)}
                                  maxSelections={selectedTickets[tt.id] || 0}
                                  ticketTypeId={tt.id}
                                  floorPlanImageUrl={event.expand?.venue_id?.layout_image ? getPocketBase().files.getUrl(event.expand.venue_id as any, (event.expand.venue_id as any).layout_image) : undefined}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    {(selectedTickets[tt.id] || 0) > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <button
                          onClick={() => handleAddToCart(tt.id)}
                          className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold text-base hover:bg-teal-700 transition-all shadow-lg"
                        >
                          Add to Cart
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  );
}

