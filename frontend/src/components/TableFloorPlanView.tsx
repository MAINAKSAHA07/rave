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
  
  // Refs to access latest state values in event handlers
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const isPanningRef = useRef(isPanning);
  const lastPinchDistanceRef = useRef(lastPinchDistance);
  const lastPinchCenterRef = useRef(lastPinchCenter);
  const initialZoomRef = useRef(initialZoom);
  const touchStartPosRef = useRef(touchStartPos);
  const panStartRef = useRef(panStart);
  const hasMovedRef = useRef(hasMoved);
  const touchCountRef = useRef(touchCount);
  
  // Keep refs in sync with state
  useEffect(() => {
    panRef.current = pan;
    zoomRef.current = zoom;
    isPanningRef.current = isPanning;
    lastPinchDistanceRef.current = lastPinchDistance;
    lastPinchCenterRef.current = lastPinchCenter;
    initialZoomRef.current = initialZoom;
    touchStartPosRef.current = touchStartPos;
    panStartRef.current = panStart;
    hasMovedRef.current = hasMoved;
    touchCountRef.current = touchCount;
  }, [pan, zoom, isPanning, lastPinchDistance, lastPinchCenter, initialZoom, touchStartPos, panStart, hasMoved, touchCount]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Add native touch event listeners with passive: false to allow preventDefault
    const container = containerRef.current;
    if (container) {
      const handleNativeTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const touchList = Array.from(e.touches);
        setTouchCount(touchList.length);
        setHasMoved(false);

        if (touchList.length === 1) {
          // Single touch - start panning
          setIsPanning(true);
          const touch = touchList[0];
          setPanStart({ x: touch.clientX - panRef.current.x, y: touch.clientY - panRef.current.y });
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
            setInitialZoom(zoomRef.current);
          }
        }
      };

      const handleNativeTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touchList = Array.from(e.touches);
        setTouchCount(touchList.length);

        if (touchList.length === 1 && isPanningRef.current) {
          // Single touch panning
          const touch = touchList[0];
          if (touchStartPosRef.current) {
            const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
            const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
            if (dx > 5 || dy > 5) {
              setHasMoved(true);
            }
          }
          setPan({
            x: touch.clientX - panStartRef.current.x,
            y: touch.clientY - panStartRef.current.y,
          });
        } else if (touchList.length === 2 && lastPinchDistanceRef.current !== null && lastPinchCenterRef.current !== null) {
          // Two touches - pinch zoom
          const distance = getDistance(touchList[0], touchList[1]);
          const scale = distance / lastPinchDistanceRef.current;
          const newZoom = Math.max(0.5, Math.min(2, initialZoomRef.current * scale));
          
          // Calculate zoom center relative to container
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const center = getCenter(touchList[0], touchList[1]);
            const centerX = center.x - rect.left;
            const centerY = center.y - rect.top;
            
            // Adjust pan to zoom towards the pinch center
            setZoom((prevZoom) => {
              const zoomDelta = newZoom / prevZoom;
              const newPanX = centerX - (centerX - panRef.current.x) * zoomDelta;
              const newPanY = centerY - (centerY - panRef.current.y) * zoomDelta;
              setPan({ x: newPanX, y: newPanY });
              return newZoom;
            });
          }
        }
      };

      const handleNativeTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const touchList = Array.from(e.touches);
        setTouchCount(touchList.length);

        if (touchList.length === 0) {
          // All touches released
          setIsPanning(false);
          setLastPinchDistance(null);
          setLastPinchCenter(null);
          setTouchStartPos(null);
          // Reset hasMoved after a short delay to allow click events
          setTimeout(() => {
            setHasMoved(false);
          }, 100);
        } else if (touchList.length === 1) {
          // One touch remaining - switch to panning
          setIsPanning(true);
          const touch = touchList[0];
          setPanStart({ x: touch.clientX - panRef.current.x, y: touch.clientY - panRef.current.y });
          setLastPinchDistance(null);
          setLastPinchCenter(null);
          setTouchStartPos({ x: touch.clientX, y: touch.clientY });
        }
      };

      // Add event listeners with passive: false
      container.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
      container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
      container.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });

      return () => {
        window.removeEventListener('resize', updateSize);
        container.removeEventListener('touchstart', handleNativeTouchStart);
        container.removeEventListener('touchmove', handleNativeTouchMove);
        container.removeEventListener('touchend', handleNativeTouchEnd);
        container.removeEventListener('touchcancel', handleNativeTouchEnd);
      };
    }
    
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
      <div className="mb-3 space-y-3">
        {/* Top Row: Reset Button and Zoom Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            onClick={resetView}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start"
          >
            🔄 Reset View
          </button>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <span className="font-medium">Zoom: {Math.round(zoom * 100)}%</span>
            <span className="hidden sm:inline">|</span>
            <span className="text-gray-500">Mouse wheel or pinch to zoom, drag to pan</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs bg-gray-50 p-2 rounded-lg border border-gray-200">
          <span className="font-semibold text-gray-700 mr-1">Status:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-green-100 border border-green-300 rounded flex-shrink-0"></div>
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-teal-600 rounded flex-shrink-0"></div>
            <span className="text-gray-700">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-yellow-100 border border-yellow-300 rounded flex-shrink-0"></div>
            <span className="text-gray-700">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-red-100 border border-red-300 rounded flex-shrink-0"></div>
            <span className="text-gray-700">Sold</span>
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
                  if (!hasMovedRef.current && !isUnavailable) {
                    e.stopPropagation();
                    onTableClick(table.id);
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle touch end for table selection
                  // Only trigger if no movement occurred and no touches are active
                  if (!hasMovedRef.current && !isUnavailable && touchCountRef.current === 0) {
                    e.stopPropagation();
                    // Use setTimeout to ensure this runs after the container's touch handlers
                    setTimeout(() => {
                      if (!hasMovedRef.current) {
                        onTableClick(table.id);
                      }
                    }, 10);
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
      {maxSelections > 0 && (
        <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-teal-900 font-medium">
              <span className="font-semibold">{selectedTableIds.length}</span> of <span className="font-semibold">{maxSelections}</span> table{maxSelections !== 1 ? 's' : ''} selected
            </p>
            {selectedTableIds.length < maxSelections && (
              <span className="text-xs text-teal-600 font-medium">
                Select {maxSelections - selectedTableIds.length} more
              </span>
            )}
            {selectedTableIds.length === maxSelections && (
              <span className="text-xs text-green-600 font-medium">
                ✓ Complete
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

