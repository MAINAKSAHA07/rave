'use client';

import { useEffect, useRef, useState } from 'react';

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
  [key: string]: any; // Allow additional properties
}

interface FloorPlanViewProps {
  seats: Seat[];
  selectedSeatIds: string[];
  reservedSeatIds: Set<string>;
  onSeatClick: (seatId: string) => void;
  maxSelections: number;
  ticketTypeId: string;
}

export default function FloorPlanView({
  seats,
  selectedSeatIds,
  reservedSeatIds,
  onSeatClick,
  maxSelections,
  ticketTypeId,
}: FloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate default positions if not set
  const seatsWithPositions = seats.map((seat, index) => {
    if (seat.position_x !== undefined && seat.position_y !== undefined) {
      return seat;
    }
    // Generate grid layout if positions not set
    const cols = Math.ceil(Math.sqrt(seats.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      ...seat,
      position_x: (col * 80) + 50,
      position_y: (row * 60) + 50,
    };
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(2, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getSeatStatus = (seat: Seat) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    const isReserved = reservedSeatIds.has(seat.id) && !isSelected;
    const isUnavailable = !seat.available || seat.sold || isReserved;

    if (isSelected) return 'selected';
    if (isReserved) return 'reserved';
    if (seat.sold) return 'sold';
    if (!seat.available) return 'unavailable';
    return 'available';
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'bg-blue-600 text-white border-blue-700';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'sold':
        return 'bg-red-100 text-red-600 border-red-300 cursor-not-allowed';
      case 'unavailable':
        return 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
      default:
        return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
    }
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Reset View
          </button>
          <span className="text-sm text-gray-600">
            Zoom: {Math.round(zoom * 100)}% | Use mouse wheel to zoom, drag to pan
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Sold</span>
          </div>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Transform container for zoom and pan */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Entrance Label */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className="px-3 py-1 bg-white border-2 border-gray-400 rounded-lg font-semibold text-xs shadow-md">
              🚪 Entrance
            </span>
          </div>

          {/* Seats */}
          {seatsWithPositions.map((seat) => {
            const status = getSeatStatus(seat);
            const isSelected = status === 'selected';
            const isUnavailable = status === 'sold' || status === 'unavailable' || status === 'reserved';

            return (
              <button
                key={seat.id}
                onClick={() => {
                  if (!isUnavailable) {
                    onSeatClick(seat.id);
                  }
                }}
                disabled={isUnavailable}
                className={`absolute px-2 py-1 text-xs font-medium rounded border-2 shadow-md transition-all ${
                  getSeatColor(status)
                } ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 z-20 scale-110' : 'z-10'} ${
                  !isUnavailable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed'
                }`}
                style={{
                  left: `${seat.position_x}px`,
                  top: `${seat.position_y}px`,
                  minWidth: '50px',
                }}
                title={`${seat.section} - Row ${seat.row} - ${seat.label}${isSelected ? ' (Selected)' : ''}${status === 'reserved' ? ' (Reserved)' : ''}${status === 'sold' ? ' (Sold)' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px]">{seat.label}</span>
                  {status === 'reserved' && <span className="text-[8px]">⏱️</span>}
                </div>
              </button>
            );
          })}

          {/* Section Labels */}
          {Array.from(new Set(seats.map(s => s.section))).map((section) => {
            const sectionSeats = seatsWithPositions.filter(s => s.section === section);
            if (sectionSeats.length === 0) return null;

            const avgX = sectionSeats.reduce((sum, s) => sum + (s.position_x || 0), 0) / sectionSeats.length;
            const minY = Math.min(...sectionSeats.map(s => s.position_y || 0));

            return (
              <div
                key={section}
                className="absolute px-2 py-1 bg-white/90 border border-gray-300 rounded text-xs font-semibold shadow-sm z-5"
                style={{
                  left: `${avgX - 30}px`,
                  top: `${minY - 25}px`,
                }}
              >
                {section}
              </div>
            );
          })}
        </div>

        {seats.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p>No seats available</p>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Selected:</strong> {selectedSeatIds.length} of {maxSelections} seat(s)
          {selectedSeatIds.length < maxSelections && (
            <span className="ml-2 text-blue-600">
              (Select {maxSelections - selectedSeatIds.length} more)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
