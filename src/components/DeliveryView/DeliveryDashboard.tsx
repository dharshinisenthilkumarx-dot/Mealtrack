import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ReceiptModal } from '../ReceiptModal';
import { OrderMap } from '../OrderMap';
import {
  Bike,
  MapPin,
  ChefHat,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  AlertCircle,
  RefreshCw,
  Navigation,
  Printer,
  Map as MapIcon,
} from 'lucide-react';

export const DeliveryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [search, setSearch] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load courier deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const unsubscribe = api.subscribeToOrderUpdates(() => {
      fetchOrders();
    });

    const interval = setInterval(fetchOrders, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus, notes?: string) => {
    try {
      setUpdatingOrderId(orderId);
      await api.updateOrderStatus(orderId, {
        status: nextStatus,
        updater_name: user?.name || 'Alex Vance (Delivery Partner)',
        updater_role: 'delivery',
        driver_id: user?.id,
        notes,
      });
      setSuccessMessage(`Order ${orderId} status updated to '${nextStatus}'. Customer notified!`);
      setTimeout(() => setSuccessMessage(null), 3500);
      await fetchOrders();
    } catch (err: any) {
      alert(`Delivery update error: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Metrics
  const readyForPickupOrders = orders.filter((o) => o.current_status === 'Ready for Pickup');
  const inTransitOrders = orders.filter((o) => o.current_status === 'Out for Delivery');
  const deliveredOrders = orders.filter((o) => o.current_status === 'Delivered');
  const pendingPrepOrders = orders.filter((o) => o.current_status === 'Order Placed' || o.current_status === 'Preparing');

  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = o.current_status === 'Ready for Pickup' || o.current_status === 'Out for Delivery';
    } else if (statusFilter === 'ready') {
      matchesStatus = o.current_status === 'Ready for Pickup';
    } else if (statusFilter === 'out') {
      matchesStatus = o.current_status === 'Out for Delivery';
    } else if (statusFilter === 'delivered') {
      matchesStatus = o.current_status === 'Delivered';
    }

    const matchesSearch =
      o.order_id.toLowerCase().includes(search.toLowerCase()) ||
      o.restaurant_name.toLowerCase().includes(search.toLowerCase()) ||
      o.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title & Courier Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-widest">
            <Bike className="w-4 h-4" />
            <span>Courier Dispatch Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-display mt-0.5">
            Active Deliveries & Runs
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Pick up ready orders from restaurant kitchens and complete contactless drop-offs at customer doorsteps.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center bg-white px-3 py-1.5 rounded-lg border border-zinc-200 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="font-medium text-zinc-700">Courier Telemetry Stream Online</span>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setStatusFilter('ready')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'ready'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">Ready for Pickup</span>
            <ChefHat className="w-4 h-4 opacity-80" />
          </div>
          <span className="text-2xl font-extrabold font-display tabular-nums">
            {readyForPickupOrders.length}
          </span>
          <span className="text-[10px] block opacity-80 mt-1">Awaiting rider arrival</span>
        </button>

        <button
          onClick={() => setStatusFilter('out')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'out'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">En Route / In Transit</span>
            <Bike className="w-4 h-4 opacity-80" />
          </div>
          <span className="text-2xl font-extrabold font-display tabular-nums">
            {inTransitOrders.length}
          </span>
          <span className="text-[10px] block opacity-80 mt-1">Active transit to customer</span>
        </button>

        <button
          onClick={() => setStatusFilter('delivered')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'delivered'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">Completed Runs</span>
            <CheckCircle2 className="w-4 h-4 opacity-80" />
          </div>
          <span className="text-2xl font-extrabold font-display tabular-nums">
            {deliveredOrders.length}
          </span>
          <span className="text-[10px] block opacity-80 mt-1">Safely dropped off</span>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">In-Kitchen Pipeline</span>
            <Clock className="w-4 h-4 opacity-80" />
          </div>
          <span className="text-2xl font-extrabold font-display tabular-nums">
            {pendingPrepOrders.length}
          </span>
          <span className="text-[10px] block opacity-80 mt-1">Cooking / Preparing</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'active', label: 'My Actionable Deliveries' },
            { id: 'ready', label: 'Ready for Pickup' },
            { id: 'out', label: 'In Transit' },
            { id: 'delivered', label: 'Completed Deliveries' },
            { id: 'all', label: 'All Orders' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Order ID, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Deliveries List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Querying courier dispatch network...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <Bike className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">No deliveries in this queue</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Orders marked 'Ready for Pickup' by restaurant kitchens will appear here for courier pickup.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order.order_id;
            const isReadyForPickup = order.current_status === 'Ready for Pickup';
            const isOutForDelivery = order.current_status === 'Out for Delivery';
            const isDelivered = order.current_status === 'Delivered';
            const isPendingKitchen = order.current_status === 'Order Placed' || order.current_status === 'Preparing';

            return (
              <div
                key={order.order_id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
                  isReadyForPickup
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : isOutForDelivery
                    ? 'border-purple-400 ring-2 ring-purple-100'
                    : 'border-zinc-200'
                }`}
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900">{order.order_id}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Print Waybill / Delivery Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedMapOrderId(expandedMapOrderId === order.order_id ? null : order.order_id)}
                        className={`p-1 transition-colors ${expandedMapOrderId === order.order_id ? 'text-orange-600' : 'text-zinc-400 hover:text-zinc-700'}`}
                        title="Toggle Delivery Route Map"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Target ETA: ~{order.eta_minutes} mins
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                      isReadyForPickup
                        ? 'bg-blue-100 text-blue-800'
                        : isOutForDelivery
                        ? 'bg-purple-100 text-purple-800'
                        : isDelivered
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {order.current_status}
                  </span>
                </div>

                {/* Body Details: Pickup & Dropoff Route */}
                <div className="p-4 flex-1 space-y-4">
                  {/* Step 1: Restaurant Pickup */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                        Step 1: Collect from Kitchen
                      </span>
                      <div className="text-xs font-bold text-zinc-900 truncate">{order.restaurant_name}</div>
                      <div className="text-xs text-zinc-500">{order.restaurant_address}</div>
                    </div>
                  </div>

                  {/* Step 2: Customer Destination Dropoff */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                        Step 2: Deliver to Customer
                      </span>
                      <div className="text-xs font-bold text-zinc-900">{order.customer_name}</div>
                      <div className="text-xs text-zinc-500">{order.delivery_address}</div>
                      <div className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        <span>{order.customer_phone}</span>
                      </div>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="p-2.5 bg-zinc-50 rounded-lg text-xs text-zinc-600 border border-zinc-200">
                      <span className="font-semibold text-zinc-700">Dropoff instructions:</span> {order.notes}
                    </div>
                  )}

                  {/* Summary of items */}
                  <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-100 flex justify-between">
                    <span>{order.items?.length || order.itemCount || 1} items packed</span>
                    <span className="font-mono tabular-nums font-semibold text-zinc-900">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Optional expanded map */}
                  {expandedMapOrderId === order.order_id && (
                    <div className="pt-2">
                      <OrderMap order={order} height="220px" />
                    </div>
                  )}
                </div>

                {/* Action Buttons for Delivery Courier */}
                <div className="p-4 border-t border-zinc-100 bg-zinc-50/40">
                  {/* Status 1: Ready for Pickup -> Courier picks up */}
                  {isReadyForPickup && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.order_id, 'Out for Delivery', 'Courier picked up order and is en route to customer.')}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Bike className="w-4 h-4" />
                          <span>Pick Up & Out for Delivery</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Status 2: Out for Delivery -> Courier drops off */}
                  {isOutForDelivery && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.order_id, 'Delivered', 'Delivered safely at customer address.')}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark as Delivered</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Status 3: Still in Kitchen Prep -> Disabled with clear message */}
                  {isPendingKitchen && (
                    <div className="py-2.5 px-3 bg-zinc-100 text-zinc-500 rounded-xl text-xs text-center font-medium border border-zinc-200 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>In kitchen preparation · Pickup locked</span>
                    </div>
                  )}

                  {/* Status 4: Delivered */}
                  {isDelivered && (
                    <div className="py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Delivery Successfully Completed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        order={receiptOrder}
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
