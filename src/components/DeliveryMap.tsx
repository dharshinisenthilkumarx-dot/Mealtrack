// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Order, OrderStatus } from '../types';
import { Bike, ChefHat, Home, MapPin, Navigation, Compass, AlertTriangle, Layers, LocateFixed } from 'lucide-react';

interface DeliveryMapProps {
  order: Order;
  apiKey?: string;
}

// Known coordinates for restaurant hubs and customer clusters
const RESTAURANT_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  rest_1: { lat: 40.7128, lng: -74.0060, name: 'The Burger Bistro' },
  rest_2: { lat: 40.7180, lng: -73.9970, name: 'Bella Roma Trattoria' },
  rest_3: { lat: 40.7549, lng: -73.9840, name: 'Tokyo Ramen & Sushi Co.' },
};

const DEFAULT_DESTINATION = { lat: 40.7310, lng: -73.9950 };

export const DeliveryMap: React.FC<DeliveryMapProps> = ({ order, apiKey }) => {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Fallback / Resolved Google Maps API key
  const effectiveApiKey =
    apiKey ||
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
    '';

  // Listen for quota events as mandated by Google Maps Platform guidelines
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const restaurantCoord = useMemo(() => {
    return RESTAURANT_LOCATIONS[order.restaurant_id] || { lat: 40.7150, lng: -74.0020, name: order.restaurant_name };
  }, [order.restaurant_id, order.restaurant_name]);

  const customerCoord = useMemo(() => {
    // Generate deterministic nearby offset based on order ID
    const hash = order.order_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 20) - 10) * 0.0015;
    const lngOffset = (((hash * 3) % 20) - 10) * 0.0015;
    return {
      lat: restaurantCoord.lat + 0.012 + latOffset,
      lng: restaurantCoord.lng + 0.008 + lngOffset,
    };
  }, [order.order_id, restaurantCoord]);

  // Interpolate courier position based on order stage:
  // 1. Order Placed / Preparing: At restaurant or starting point
  // 2. Ready for Pickup: At restaurant pickup spot
  // 3. Out for Delivery: Mid-route (65% towards customer)
  // 4. Delivered: At customer doorstep (100%)
  const courierCoord = useMemo(() => {
    let progress = 0;
    if (order.current_status === 'Order Placed') progress = 0.05;
    else if (order.current_status === 'Preparing') progress = 0.15;
    else if (order.current_status === 'Ready for Pickup') progress = 0.25;
    else if (order.current_status === 'Out for Delivery') progress = 0.70;
    else if (order.current_status === 'Delivered') progress = 1.0;

    return {
      lat: restaurantCoord.lat + (customerCoord.lat - restaurantCoord.lat) * progress,
      lng: restaurantCoord.lng + (customerCoord.lng - restaurantCoord.lng) * progress,
      progress,
    };
  }, [order.current_status, restaurantCoord, customerCoord]);

  const mapCenter = useMemo(() => {
    return {
      lat: (restaurantCoord.lat + customerCoord.lat) / 2,
      lng: (restaurantCoord.lng + customerCoord.lng) / 2,
    };
  }, [restaurantCoord, customerCoord]);

  // Turn-by-turn waypoints for SVG / visual rendering
  const waypoints = useMemo(() => {
    const mid1 = {
      lat: restaurantCoord.lat + (customerCoord.lat - restaurantCoord.lat) * 0.35,
      lng: restaurantCoord.lng,
    };
    const mid2 = {
      lat: restaurantCoord.lat + (customerCoord.lat - restaurantCoord.lat) * 0.35,
      lng: customerCoord.lng,
    };
    return [restaurantCoord, mid1, mid2, customerCoord];
  }, [restaurantCoord, customerCoord]);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs mb-8">
      {/* Quota Defense Banner (Case A Requirement) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs text-center sticky top-0 z-50">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Map Control Bar */}
      <div className="p-4 bg-zinc-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold uppercase tracking-wider font-display">
            Live Delivery Route Telemetry
          </span>
          <span className="text-zinc-500">·</span>
          <span className="text-xs text-zinc-300">
            {order.current_status === 'Delivered'
              ? 'Arrived at Destination'
              : order.current_status === 'Out for Delivery'
              ? 'Courier in Transit'
              : 'Kitchen Preparation Phase'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-400">Est. Distance:</span>
            <span className="font-mono tabular-nums text-zinc-200 font-bold">1.8 miles</span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-400">Transit Mode:</span>
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              Express Courier
            </span>
          </div>
        </div>
      </div>

      {/* Map Surface */}
      <div className="relative w-full h-80 sm:h-96 bg-zinc-100 overflow-hidden">
        {effectiveApiKey ? (
          /* Google Maps Platform React SDK implementation */
          <APIProvider apiKey={effectiveApiKey}>
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultCenter={mapCenter}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapTypeId={mapType}
            >
              {/* Restaurant Pickup Marker */}
              <AdvancedMarker position={restaurantCoord} title={order.restaurant_name}>
                <div className="flex items-center gap-1.5 bg-zinc-900 text-white px-2.5 py-1 rounded-full shadow-lg border-2 border-orange-500 text-xs font-bold whitespace-nowrap">
                  <ChefHat className="w-3.5 h-3.5 text-orange-400" />
                  <span>{order.restaurant_name}</span>
                </div>
              </AdvancedMarker>

              {/* Courier Marker */}
              <AdvancedMarker position={{ lat: courierCoord.lat, lng: courierCoord.lng }} title="Courier Partner">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-orange-400 opacity-75" />
                  <div className="relative w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <Bike className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Customer Destination Marker */}
              <AdvancedMarker position={customerCoord} title="Delivery Address">
                <div className="flex items-center gap-1.5 bg-emerald-700 text-white px-2.5 py-1 rounded-full shadow-lg border-2 border-white text-xs font-bold whitespace-nowrap">
                  <Home className="w-3.5 h-3.5" />
                  <span>{order.customer_name}</span>
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          /* High-Fidelity Resilient Interactive Map Display */
          <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden select-none">
            {/* Styled Road Grid Background */}
            <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#52525b" strokeWidth="1" />
                </pattern>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Curving Delivery Transit Route */}
              <path
                d="M 120 280 C 220 280, 260 140, 480 140 C 600 140, 680 80, 800 80"
                fill="none"
                stroke="#3f3f46"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 120 280 C 220 280, 260 140, 480 140 C 600 140, 680 80, 800 80"
                fill="none"
                stroke="url(#routeGrad)"
                strokeWidth="4"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            </svg>

            {/* Restaurant Station Node (Left) */}
            <div className="absolute left-8 sm:left-16 bottom-12 flex flex-col items-center z-10">
              <div className="flex items-center gap-1.5 bg-zinc-950/90 text-white px-3 py-1.5 rounded-full border border-orange-500/80 shadow-md mb-2">
                <ChefHat className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold">{order.restaurant_name}</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-orange-600 ring-4 ring-orange-400/40" />
              <span className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold">Origin</span>
            </div>

            {/* Courier Node (Interpolated along path) */}
            <div
              className="absolute z-20 transition-all duration-1000 flex flex-col items-center"
              style={{
                left: `${18 + courierCoord.progress * 62}%`,
                top: `${72 - courierCoord.progress * 50}%`,
              }}
            >
              <div className="relative flex items-center justify-center mb-1">
                <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-orange-500 opacity-60" />
                <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                  <Bike className="w-4 h-4" />
                </div>
              </div>
              <div className="bg-zinc-950/90 text-orange-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-zinc-800 whitespace-nowrap">
                {order.current_status === 'Delivered'
                  ? 'Delivered'
                  : order.current_status === 'Out for Delivery'
                  ? 'Moving (18 mph)'
                  : 'Preparing for Pickup'}
              </div>
            </div>

            {/* Customer Doorstep Node (Right) */}
            <div className="absolute right-8 sm:right-16 top-10 flex flex-col items-center z-10">
              <div className="flex items-center gap-1.5 bg-zinc-950/90 text-white px-3 py-1.5 rounded-full border border-emerald-500/80 shadow-md mb-2">
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold">{order.customer_name}</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-400/40" />
              <span className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold">Dropoff</span>
            </div>

            {/* Street Overlays */}
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-zinc-500">
              Corridor: Grand Ave ➔ Broadway Blvd ➔ Elm St
            </div>
            <div className="absolute top-3 right-4 text-[10px] font-mono text-zinc-500">
              GPS: {customerCoord.lat.toFixed(4)}° N, {Math.abs(customerCoord.lng).toFixed(4)}° W
            </div>
          </div>
        )}

        {/* Live Legend Floating Strip */}
        <div className="absolute bottom-3 right-3 z-10 bg-zinc-950/80 backdrop-blur text-white text-[11px] px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Kitchen</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span>Courier</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Customer</span>
          </div>
        </div>
      </div>

      {/* Route Waypoint Notes */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
          <span>
            <strong className="text-zinc-900">Pickup:</strong> {order.restaurant_address}
          </span>
          <span className="text-zinc-300">➔</span>
          <span>
            <strong className="text-zinc-900">Dropoff:</strong> {order.delivery_address}
          </span>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono">
          Route Optimization: Eco-Friendly Urban Corridor
        </div>
      </div>
    </div>
  );
};
