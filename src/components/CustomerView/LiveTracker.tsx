import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';
import {
  Clock,
  CheckCircle2,
  Package,
  ChefHat,
  ShoppingBag,
  Bike,
  Home,
  Copy,
  Check,
  MapPin,
  Phone,
  Timer,
  AlertCircle,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { DeliveryMap } from '../DeliveryMap';
import { OrderReceiptModal } from '../OrderReceiptModal';

interface LiveTrackerProps {
  orderId?: string;
  onSelectOrder?: (id: string) => void;
  onBackToMenu?: () => void;
}

const STAGES: {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    status: 'Order Placed',
    label: 'Order Placed',
    description: 'Order confirmed by customer and routed to kitchen',
    icon: Package,
  },
  {
    status: 'Preparing',
    label: 'Preparing in Kitchen',
    description: 'Fresh ingredients being prepared and cooked',
    icon: ChefHat,
  },
  {
    status: 'Ready for Pickup',
    label: 'Ready for Pickup',
    description: 'Packed hot and awaiting delivery courier',
    icon: ShoppingBag,
  },
  {
    status: 'Out for Delivery',
    label: 'Out for Delivery',
    description: 'Courier picked up order and is en route to you',
    icon: Bike,
  },
  {
    status: 'Delivered',
    label: 'Delivered',
    description: 'Package delivered at your doorstep',
    icon: Home,
  },
];

export const LiveTracker: React.FC<LiveTrackerProps> = ({
  orderId,
  onSelectOrder,
  onBackToMenu,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchActiveOrders = async () => {
    try {
      const orders = await api.getOrders();
      setAllOrders(orders);
      
      // Determine which order to display
      let selected: Order | null = null;
      if (orderId) {
        selected = orders.find((o) => o.order_id === orderId) || null;
      }
      if (!selected) {
        // Find most recent active order or last order
        selected = orders.find((o) => o.current_status !== 'Delivered') || orders[0] || null;
      }

      if (selected) {
        // Fetch single order to get full history and items
        const full = await api.getOrderById(selected.order_id);
        setOrder(full);
        setLastUpdatedTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching tracker order:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    // Subscribe to real-time updates via SSE
    const unsubscribe = api.subscribeToOrderUpdates((event) => {
      if (event.type === 'order_updated' || event.type === 'order_created' || event.type === 'reset_data') {
        fetchActiveOrders();
      }
    });

    // Fallback polling interval every 3 seconds for 100% reliable tracking
    const interval = setInterval(() => {
      fetchActiveOrders();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageIndex = (status: OrderStatus) => {
    return STAGES.findIndex((s) => s.status === status);
  };

  const currentStageIdx = order ? getStageIndex(order.current_status) : -1;

  if (loading && !order) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Connecting to real-time order telemetry...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">No Active Orders Yet</h2>
        <p className="text-sm text-zinc-600 mb-6">
          Place an order from our restaurant menu to experience live end-to-end tracking.
        </p>
        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm"
          >
            Explore Food Menu
          </button>
        )}
      </div>
    );
  }

  // Calculate ETA Formula Breakdown values
  const prepTime = order.prep_time_minutes || 18;
  const pickupTime = order.pickup_time_minutes || 6;
  const travelTime = order.travel_time_minutes || 14;

  let remainingPrepDisplay = '0m';
  let remainingPickupDisplay = '0m';
  let remainingTravelDisplay = '0m';

  if (order.current_status === 'Order Placed') {
    remainingPrepDisplay = `${prepTime}m`;
    remainingPickupDisplay = `${pickupTime}m`;
    remainingTravelDisplay = `${travelTime}m`;
  } else if (order.current_status === 'Preparing') {
    remainingPrepDisplay = `${Math.round(prepTime * 0.65)}m`;
    remainingPickupDisplay = `${pickupTime}m`;
    remainingTravelDisplay = `${travelTime}m`;
  } else if (order.current_status === 'Ready for Pickup') {
    remainingPrepDisplay = '0m (Done)';
    remainingPickupDisplay = `${pickupTime}m`;
    remainingTravelDisplay = `${travelTime}m`;
  } else if (order.current_status === 'Out for Delivery') {
    remainingPrepDisplay = '0m (Done)';
    remainingPickupDisplay = '0m (Done)';
    remainingTravelDisplay = `${travelTime}m`;
  } else if (order.current_status === 'Delivered') {
    remainingPrepDisplay = '0m';
    remainingPickupDisplay = '0m';
    remainingTravelDisplay = '0m';
  }

  const isDelivered = order.current_status === 'Delivered';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Selector if multiple orders exist */}
      {allOrders.length > 1 && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs text-zinc-500 font-medium shrink-0">Switch Order:</span>
            {allOrders.map((o) => (
              <button
                key={o.order_id}
                onClick={() => onSelectOrder && onSelectOrder(o.order_id)}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                  o.order_id === order.order_id
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {o.order_id} ({o.current_status})
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchActiveOrders();
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors shrink-0"
            title="Refresh order state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Updated {lastUpdatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </button>
        </div>
      )}

      {/* Main Tracking Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
        {/* Header Strip with Order ID, Status, and Restaurant */}
        <div className="bg-zinc-950 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-wider text-orange-400 uppercase font-semibold">
                  Live Food Tracking
                </span>
                <span className="text-zinc-500">·</span>
                <button
                  onClick={handleCopyOrderId}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="font-mono tabular-nums font-medium text-white">{order.order_id}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white font-display">
                {order.restaurant_name}
              </h1>

              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                <span>Placed {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>·</span>
                <span>{order.items?.length || order.itemCount || 1} items</span>
                <span>·</span>
                <span className="font-mono tabular-nums text-zinc-200 font-semibold">${order.total_amount.toFixed(2)}</span>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-orange-400" />
                  <span>Print Official Receipt</span>
                </button>
              </div>
            </div>

            {/* Live ETA Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:min-w-[220px]">
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                <Timer className="w-4 h-4 text-orange-400" />
                <span className="font-medium uppercase tracking-wide">
                  {isDelivered ? 'Delivery Complete' : 'Estimated Arrival'}
                </span>
              </div>

              {isDelivered ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Delivered!</span>
                </div>
              ) : (
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tabular-nums">
                    {order.eta_minutes} <span className="text-sm font-normal text-zinc-400">mins</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Target: {new Date(order.estimated_delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Status Banner */}
          <div className="pt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDelivered ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isDelivered ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              </span>
              <div>
                <span className="text-xs text-zinc-400">Current Phase:</span>
                <span className="text-sm font-bold text-white ml-2">{order.current_status}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-400 hidden sm:block">
                Live updates active via Real-Time Telemetry
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-orange-400" />
                <span>Print Order Receipt</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5-Stage Visual Progress Tracker */}
        <div className="p-6 sm:p-8 bg-zinc-50 border-b border-zinc-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-6">
            Stage Progression
          </h3>

          <div className="relative">
            {/* Desktop progress line */}
            <div className="hidden md:block absolute top-6 left-8 right-8 h-1 bg-zinc-200 -z-0">
              <div
                className="h-full bg-orange-600 transition-all duration-500"
                style={{
                  width: `${(Math.max(0, currentStageIdx) / (STAGES.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
              {STAGES.map((stage, idx) => {
                const IconComponent = stage.icon;
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                const isUpcoming = idx > currentStageIdx;

                return (
                  <div
                    key={stage.status}
                    className={`flex md:flex-col items-center md:items-center text-left md:text-center gap-3 md:gap-2 p-3 md:p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-orange-50 md:bg-transparent border border-orange-200 md:border-transparent'
                        : ''
                    }`}
                  >
                    {/* Circle Node */}
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        isPassed
                          ? 'bg-orange-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-200 shadow-md'
                          : 'bg-white border-2 border-zinc-300 text-zinc-400'
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                    </div>

                    {/* Text labels */}
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold leading-tight ${
                          isCurrent
                            ? 'text-orange-900 font-extrabold'
                            : isPassed
                            ? 'text-zinc-900'
                            : 'text-zinc-400'
                        }`}
                      >
                        {stage.label}
                      </div>

                      <div
                        className={`text-[11px] mt-0.5 line-clamp-2 ${
                          isCurrent ? 'text-orange-700' : 'text-zinc-500'
                        }`}
                      >
                        {stage.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Delivery Route & Courier Map (Google Maps Platform) */}
        <div className="p-6 sm:p-8 bg-white border-b border-zinc-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Live Route & Courier Telemetry Map
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Kitchen: <strong className="text-zinc-800">{order.restaurant_name}</strong> · Dropoff: <strong className="text-zinc-800">{order.delivery_address.split(',')[0]}</strong>
            </span>
          </div>

          <OrderMap order={order} height="360px" />
        </div>

        {/* Dynamic ETA Formula Calculation Breakdown Card (Prompt Requirement #4) */}
        <div className="p-6 sm:p-8 border-b border-zinc-200">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Dynamic ETA Breakdown
            </h3>
            <span className="text-xs font-mono text-zinc-600">
              Formula: ETA = Remaining Prep + Pickup + Travel
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <div>
              <span className="text-xs text-zinc-500 block">Remaining Prep</span>
              <span className="text-base font-bold text-zinc-900 font-mono tabular-nums">
                {remainingPrepDisplay}
              </span>
              <span className="text-[11px] text-zinc-600 block mt-0.5">Kitchen prep work</span>
            </div>

            <div>
              <span className="text-xs text-zinc-500 block">Pickup & Handover</span>
              <span className="text-base font-bold text-zinc-900 font-mono tabular-nums">
                {remainingPickupDisplay}
              </span>
              <span className="text-[11px] text-zinc-600 block mt-0.5">Courier arrival</span>
            </div>

            <div>
              <span className="text-xs text-zinc-500 block">Travel & Route</span>
              <span className="text-base font-bold text-zinc-900 font-mono tabular-nums">
                {remainingTravelDisplay}
              </span>
              <span className="text-[11px] text-zinc-600 block mt-0.5">Road transit</span>
            </div>

            <div className="bg-white rounded-lg p-3 border border-orange-200 flex flex-col justify-center">
              <span className="text-xs text-orange-700 font-medium block">Total Remaining</span>
              <span className="text-xl font-extrabold text-orange-600 font-display tabular-nums">
                {isDelivered ? '0m' : `${order.eta_minutes} mins`}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Bottom Area: Order Details & Full Audit Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
          {/* Left Column: Delivery Details & Items */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wider text-xs">
                Fulfillment Route
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500 font-medium">Pickup Restaurant</div>
                    <div className="text-sm font-semibold text-zinc-900">{order.restaurant_name}</div>
                    <div className="text-xs text-zinc-600">{order.restaurant_address}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500 font-medium">Customer Destination</div>
                    <div className="text-sm font-semibold text-zinc-900">{order.customer_name}</div>
                    <div className="text-xs text-zinc-600">{order.delivery_address}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{order.customer_phone}</span>
                    </div>
                  </div>
                </div>

                {order.delivery_partner_name && (
                  <div className="flex items-start gap-3 pt-2 border-t border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500 font-medium">Assigned Delivery Courier</div>
                      <div className="text-sm font-semibold text-zinc-900">{order.delivery_partner_name}</div>
                      {order.delivery_partner_phone && (
                        <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{order.delivery_partner_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items summary */}
            <div className="pt-4 border-t border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
                Items in this Order ({order.items?.length || 0})
              </h3>
              <div className="space-y-2.5">
                {order.items?.map((it) => (
                  <div key={it.order_item_id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 font-mono tabular-nums">{it.quantity}x</span>
                      <span className="text-zinc-800">{it.item_name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-zinc-600 font-medium">
                      ${(it.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-4 p-2.5 bg-zinc-50 rounded-lg text-xs text-zinc-600 border border-zinc-200">
                  <span className="font-semibold text-zinc-700">Special Instructions:</span> {order.notes}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status Update Timestamps & Timeline */}
          <div className="p-6 sm:p-8">
            <h3 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider text-xs">
              Chronological Audit Timeline
            </h3>

            {order.history && order.history.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {order.history.map((record) => {
                  const recordDate = new Date(record.timestamp);
                  return (
                    <div key={record.history_id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-orange-600 ring-4 ring-white" />

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-900">{record.status}</span>
                          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                            {recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Updated by: <span className="text-zinc-700 font-medium">{record.updated_by}</span>
                        </div>

                        {record.notes && (
                          <div className="text-xs text-zinc-600 mt-1 bg-zinc-50 p-2 rounded border border-zinc-100">
                            {record.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No timeline entries recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        order={order}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
