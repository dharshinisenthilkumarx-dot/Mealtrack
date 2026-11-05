import React, { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Order, OrderStatus } from '../types';
import { ChefHat, Home, Bike, Navigation, Layers, Compass, CheckCircle2 } from 'lucide-react';

interface OrderMapProps {
  order: Order;
  height?: string;
}

// Coordinates for sample restaurants & destinations
const RESTAURANT_COORDS: Record<string, { lat: number; lng: number }> = {
  rest_1: { lat: 37.7749, lng: -122.4194 }, // The Burger Bistro, Downtown
  rest_2: { lat: 37.7845, lng: -122.4080 }, // Bella Roma, Little Italy
  rest_3: { lat: 37.7680, lng: -122.4310 }, // Tokyo Ramen, Midtown
};

const DEFAULT_DESTINATION = { lat: 37.7795, lng: -122.4150 };

export const OrderMap: React.FC<OrderMapProps> = ({ order, height = '380px' }) => {
  const [mapError, setMapError] = useState(false);
  const [viewMode, setViewMode] = useState<'fit' | 'courier'>('fit');

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Get restaurant origin
  const origin = useMemo(() => {
    return RESTAURANT_COORDS[order.restaurant_id] || RESTAURANT_COORDS.rest_1;
  }, [order.restaurant_id]);

  // Destination coords (subtly varied based on order ID)
  const destination = useMemo(() => {
    if (order.customer_id === 'usr_cust_2') {
      return { lat: 37.7885, lng: -122.4110 };
    }
    return DEFAULT_DESTINATION;
  }, [order.customer_id]);

  // Interpolate courier position based on stage status
  const courierProgress = useMemo(() => {
    switch (order.current_status) {
      case 'Order Placed':
        return 0.05;
      case 'Preparing':
        return 0.12;
      case 'Ready for Pickup':
        return 0.2;
      case 'Out for Delivery':
        return 0.65;
      case 'Delivered':
        return 1.0;
      default:
        return 0.5;
    }
  }, [order.current_status]);

  const courierPos = useMemo(() => {
    return {
      lat: origin.lat + (destination.lat - origin.lat) * courierProgress,
      lng: origin.lng + (destination.lng - origin.lng) * courierProgress,
    };
  }, [origin, destination, courierProgress]);

  // Center coordinates
  const center = useMemo(() => {
    if (viewMode === 'courier') return courierPos;
    return {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
  }, [origin, destination, courierPos, viewMode]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 shadow-sm"
      style={{ height, minHeight: '340px' }}
    >
      {/* Top Map Status Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 flex-wrap pointer-events-auto">
        <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-white text-xs flex items-center gap-2 shadow-sm">
          <Navigation className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-semibold">{order.restaurant_name}</span>
          <span className="text-zinc-500">→</span>
          <span className="text-zinc-300 truncate max-w-[140px]">{order.delivery_address.split(',')[0]}</span>
        </div>

        <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-zinc-800 text-xs flex items-center gap-1.5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
          <span className="font-mono tabular-nums text-zinc-200">
            {order.current_status === 'Delivered' ? 'Delivered' : `ETA: ~${order.eta_minutes}m`}
          </span>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'fit' ? 'courier' : 'fit')}
          className="bg-white/95 hover:bg-white text-zinc-800 p-2 rounded-xl shadow-md border border-zinc-200 transition-all text-xs font-semibold flex items-center gap-1"
          title="Toggle Focus"
        >
          <Compass className="w-4 h-4 text-orange-600" />
          <span className="hidden sm:inline">{viewMode === 'fit' ? 'Focus Courier' : 'Show All'}</span>
        </button>
      </div>

      {/* Main Map: Google Maps with Fallback Vector Delivery Canvas */}
      {!mapError && apiKey ? (
        <APIProvider apiKey={apiKey} libraries={['marker', 'routes']}>
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultCenter={center}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            {/* Restaurant Marker */}
            <AdvancedMarker position={origin} title={order.restaurant_name}>
              <div className="bg-orange-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
            </AdvancedMarker>

            {/* Customer Dropoff Marker */}
            <AdvancedMarker position={destination} title={order.delivery_address}>
              <div className="bg-emerald-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
            </AdvancedMarker>

            {/* Courier In-Transit Marker */}
            <AdvancedMarker position={courierPos} title="Delivery Courier">
              <div className="relative">
                <span className="animate-ping absolute -top-1 -left-1 w-8 h-8 rounded-full bg-orange-400 opacity-60" />
                <div className="relative bg-zinc-950 text-orange-400 p-2 rounded-full shadow-xl border-2 border-orange-500 flex items-center justify-center">
                  <Bike className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>
          </Map>
        </APIProvider>
      ) : (
        /* Realistic Interactive Vector Street Grid & Delivery Route */
        <div className="w-full h-full relative bg-zinc-900 select-none overflow-hidden">
          {/* Stylized Dark Grid Map Streets */}
          <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="street-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#27272a" strokeWidth="2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#18181b" />
            <rect width="100%" height="100%" fill="url(#street-grid)" opacity="0.6" />

            {/* Major Arterial Roads */}
            <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#3f3f46" strokeWidth="8" opacity="0.4" />
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#3f3f46" strokeWidth="6" opacity="0.3" />
            <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#3f3f46" strokeWidth="6" opacity="0.3" />
            <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#3f3f46" strokeWidth="8" opacity="0.4" />

            {/* Active Delivery Route Polyline */}
            <path
              d="M 18% 68% Q 35% 65%, 45% 48% T 82% 32%"
              fill="none"
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="8 6"
              className="animate-pulse"
            />
            {/* Completed Route Segment */}
            <path
              d={`M 18% 68% Q 35% 65%, 45% 48%`}
              fill="none"
              stroke="#f97316"
              strokeWidth="5"
              strokeLinecap="round"
              opacity={courierProgress > 0.4 ? '1' : '0.4'}
            />
          </svg>

          {/* Restaurant Marker (Origin) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
            style={{ left: '18%', top: '68%' }}
          >
            <div className="bg-orange-600 text-white p-2.5 rounded-full shadow-lg ring-4 ring-orange-950 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="bg-zinc-950/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 border border-zinc-800 whitespace-nowrap shadow-sm">
              {order.restaurant_name}
            </span>
          </div>

          {/* Customer Destination Marker */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
            style={{ left: '82%', top: '32%' }}
          >
            <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow-lg ring-4 ring-emerald-950 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <span className="bg-zinc-950/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 border border-zinc-800 whitespace-nowrap shadow-sm">
              {order.delivery_address.split(',')[0]}
            </span>
          </div>

          {/* Animated Courier Marker */}
          {order.current_status !== 'Delivered' ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 flex flex-col items-center z-20"
              style={{
                left: `${18 + (82 - 18) * courierProgress}%`,
                top: `${68 + (32 - 68) * courierProgress}%`,
              }}
            >
              <div className="relative">
                <span className="animate-ping absolute -top-1 -left-1 w-8 h-8 rounded-full bg-orange-500 opacity-60" />
                <div className="relative bg-zinc-950 text-orange-400 p-2.5 rounded-full shadow-2xl ring-2 ring-orange-500 flex items-center justify-center">
                  <Bike className="w-4 h-4" />
                </div>
              </div>
              <span className="bg-orange-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1 shadow-md whitespace-nowrap uppercase tracking-wider">
                Courier En Route
              </span>
            </div>
          ) : (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20"
              style={{ left: '82%', top: '22%' }}
            >
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safely Arrived</span>
              </span>
            </div>
          )}

          {/* Bottom Map Legend */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-zinc-400 pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-zinc-800/80 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-600" /> Kitchen Pickup
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Destination
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" /> Live Courier
              </span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] text-zinc-500 hidden sm:block">
              Google Maps Telemetry Active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
