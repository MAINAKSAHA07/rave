'use client';

import { useEffect, useRef, useState } from 'react';

interface Table {
  id: string;
  name: string;
  capacity: number;
  section: string;
  available?: boolean;
  reserved?: boolean;
  sold?: boolean;
  position_x?: number;
  position_y?: number;
  [key: string]: any;
}

interface TableFloorPlanViewProps {
  tables: Table[];
  selectedTableIds: string[];
  reservedTableIds: Set<string>;
  onTableClick: (tableId: string) => void;
  maxSelections: number;
  ticketTypeId: string;
  floorPlanImageUrl?: string;
}

export default function TableFloorPlanView({
  tables,
  selectedTableIds,
  reservedTableIds,
  onTableClick,
  maxSelections,
  ticketTypeId,
  floorPlanImageUrl,
}: TableFloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Touch/pinch zoom state
  const [touchCount, setTouchCount] = useState(0);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [lastPinchCenter, setLastPinchCenter] = useState<{ x: number; y: number } | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [hasMoved, setHasMoved] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);

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
  const tablesWithPositions = tables.map((table, index) => {
    if (table.position_x !== undefined && table.position_y !== undefined) {
      return table;
    }
    // Generate grid layout if positions not set
    const cols = Math.ceil(Math.sqrt(tables.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      ...table,
      position_x: (col * 120) + 50,
      position_y: (row * 100) + 50,
    };
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setHasMoved(false);
      setTouchStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      if (touchStartPos) {
        const dx = Math.abs(e.clientX - touchStartPos.x);
        const dy = Math.abs(e.clientY - touchStartPos.y);
        if (dx > 5 || dy > 5) {
          setHasMoved(true);
        }
      }
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setTouchStartPos(null);
    // Reset hasMoved after a short delay to allow click events
    setTimeout(() => setHasMoved(false), 100);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(2, prev * delta)));
  };

  // Calculate distance between two touch points
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touchList = Array.from(e.touches);
    setTouchCount(touchList.length);
    setHasMoved(false);

    if (touchList.length === 1) {
      // Single touch - start panning
      setIsPanning(true);
      const touch = touchList[0];
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    } else if (touchList.length === 2) {
      // Two touches - start pinch zoom
      setIsPanning(false);
      setHasMoved(true); // Pinch is always considered movement
      const distance = getDistance(touchList[0], touchList[1]);
      const center = getCenter(touchList[0], touchList[1]);
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        
        setLastPinchDistance(distance);
        setLastPinchCenter({ x: centerX, y: centerY });
        setInitialZoom(zoom);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touchList = Array.from(e.touches);
    setTouchCount(touchList.length);

    if (touchList.length === 1 && isPanning) {
      // Single touch panning
      const touch = touchList[0];
      if (touchStartPos) {
        const dx = Math.abs(touch.clientX - touchStartPos.x);
        const dy = Math.abs(touch.clientY - touchStartPos.y);
        if (dx > 5 || dy > 5) {
          setHasMoved(true);
        }
      }
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
    } else if (touchList.length === 2 && lastPinchDistance !== null && lastPinchCenter !== null) {
      // Two touches - pinch zoom
      const distance = getDistance(touchList[0], touchList[1]);
      const scale = distance / lastPinchDistance;
      const newZoom = Math.max(0.5, Math.min(2, initialZoom * scale));
      
      // Calculate zoom center relative to container
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const center = getCenter(touchList[0], touchList[1]);
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        
        // Adjust pan to zoom towards the pinch center
        const zoomDelta = newZoom / zoom;
        const newPanX = centerX - (centerX - pan.x) * zoomDelta;
        const newPanY = centerY - (centerY - pan.y) * zoomDelta;
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const touchList = Array.from(e.touches);
    setTouchCount(touchList.length);

    if (touchList.length === 0) {
      // All touches released
      setIsPanning(false);
      setLastPinchDistance(null);
      setLastPinchCenter(null);
      setTouchStartPos(null);
    } else if (touchList.length === 1) {
      // One touch remaining - switch to panning
      setIsPanning(true);
      const touch = touchList[0];
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setLastPinchDistance(null);
      setLastPinchCenter(null);
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getTableStatus = (table: Table) => {
    const isSelected = selectedTableIds.includes(table.id);
    const isReserved = reservedTableIds.has(table.id) && !isSelected;
    const isUnavailable = !table.available || table.sold || isReserved;

    if (isSelected) return 'selected';
    if (isReserved) return 'reserved';
    if (table.sold) return 'sold';
    if (!table.available) return 'unavailable';
    return 'available';
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'bg-teal-600 text-white border-teal-700';
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
            Zoom: {Math.round(zoom * 100)}% | Mouse wheel or pinch to zoom, drag to pan
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-teal-600 rounded"></div>
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
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
          {/* Floor Plan Background Image */}
          {floorPlanImageUrl && (
            <img
              src={floorPlanImageUrl}
              alt="Floor Plan"
              className="absolute inset-0 w-full h-full object-contain z-0"
              style={{ opacity: 0.4 }}
            />
          )}
          
          {/* Entrance Label */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className="px-3 py-1 bg-white border-2 border-gray-400 rounded-lg font-semibold text-xs shadow-md">
              🚪 Entrance
            </span>
          </div>

          {/* Tables */}
          {tablesWithPositions.map((table) => {
            const status = getTableStatus(table);
            const isSelected = status === 'selected';
            const isUnavailable = status === 'sold' || status === 'unavailable' || status === 'reserved';

            return (
              <button
                key={table.id}
                onClick={(e) => {
                  // Prevent click if user was panning/zooming
                  if (!hasMoved && !isUnavailable) {
                    onTableClick(table.id);
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle touch end for table selection
                  if (!hasMoved && !isUnavailable && touchCount === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    onTableClick(table.id);
                  }
                }}
                disabled={isUnavailable}
                className={`absolute px-3 py-2 text-xs font-medium rounded-lg border-2 shadow-md transition-all ${
                  getTableColor(status)
                } ${isSelected ? 'ring-2 ring-teal-400 ring-offset-1 z-20 scale-110' : 'z-10'} ${
                  !isUnavailable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed'
                }`}
                style={{
                  left: `${table.position_x}px`,
                  top: `${table.position_y}px`,
                  minWidth: '80px',
                }}
                title={`${table.name} - ${table.section}${table.capacity ? ` (Capacity: ${table.capacity})` : ''}${isSelected ? ' (Selected)' : ''}${status === 'reserved' ? ' (Reserved)' : ''}${status === 'sold' ? ' (Sold)' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-bold">{table.name}</span>
                  {table.capacity && (
                    <span className="text-[10px] mt-0.5">👥 {table.capacity}</span>
                  )}
                  {table.section && (
                    <span className="text-[9px] opacity-75">{table.section}</span>
                  )}
                  {status === 'reserved' && <span className="text-[8px] mt-0.5">⏱️</span>}
                </div>
              </button>
            );
          })}

          {/* Section Labels */}
          {Array.from(new Set(tables.map(t => t.section).filter(Boolean))).map((section) => {
            const sectionTables = tablesWithPositions.filter(t => t.section === section);
            if (sectionTables.length === 0) return null;

            const avgX = sectionTables.reduce((sum, t) => sum + (t.position_x || 0), 0) / sectionTables.length;
            const minY = Math.min(...sectionTables.map(t => t.position_y || 0));

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

        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p>No tables available</p>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
        <p className="text-sm text-teal-800">
          <strong>Selected:</strong> {selectedTableIds.length} of {maxSelections} table(s)
          {selectedTableIds.length < maxSelections && (
            <span className="ml-2 text-teal-600">
              (Select {maxSelections - selectedTableIds.length} more)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

