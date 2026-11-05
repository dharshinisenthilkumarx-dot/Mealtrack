import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ReceiptModal } from '../ReceiptModal';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Package,
  ShoppingBag,
  Search,
  Phone,
  MapPin,
  AlertCircle,
  Play,
  Check,
  RefreshCw,
  Printer,
} from 'lucide-react';

export const RestaurantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [search, setSearch] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load restaurant orders:', err);
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
        updater_name: user?.name || 'Chef Marco (Kitchen Staff)',
        updater_role: 'restaurant',
        notes,
      });
      setSuccessMessage(`Order ${orderId} moved to '${nextStatus}'. Live customer tracker updated!`);
      setTimeout(() => setSuccessMessage(null), 3500);
      await fetchOrders();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Metrics
  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.current_status === 'Order Placed');
  const preparingOrders = orders.filter((o) => o.current_status === 'Preparing');
  const readyOrders = orders.filter((o) => o.current_status === 'Ready for Pickup');
  const completedOrders = orders.filter((o) => o.current_status === 'Delivered');

  // Filtered list
  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = o.current_status !== 'Delivered';
    } else if (statusFilter === 'Order Placed') {
      matchesStatus = o.current_status === 'Order Placed';
    } else if (statusFilter === 'Preparing') {
      matchesStatus = o.current_status === 'Preparing';
    } else if (statusFilter === 'Ready for Pickup') {
      matchesStatus = o.current_status === 'Ready for Pickup';
    } else if (statusFilter === 'completed') {
      matchesStatus = o.current_status === 'Delivered';
    }

    const matchesSearch =
      o.order_id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.restaurant_name.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title & Kitchen Staff Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-widest">
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Display System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-display mt-0.5">
            Restaurant Order Pipeline
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Accept incoming ticket tickets, trigger real-time preparation timers, and signal couriers when packed.
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-white px-3 py-1.5 rounded-lg border border-zinc-200 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-medium text-zinc-700">Real-Time Kitchen Feed Active</span>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block opacity-70">Total Tickets</span>
          <span className="text-2xl font-extrabold font-display tabular-nums block mt-1">
            {totalOrders}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Order Placed')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'Order Placed'
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-orange-200'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block text-orange-600 font-bold">
            New / Pending ({newOrders.length})
          </span>
          <span className="text-2xl font-extrabold font-display tabular-nums block mt-1 text-orange-600">
            {newOrders.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Preparing')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'Preparing'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block text-amber-600 font-bold">
            Preparing ({preparingOrders.length})
          </span>
          <span className="text-2xl font-extrabold font-display tabular-nums block mt-1 text-amber-600">
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Ready for Pickup')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'Ready for Pickup'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-blue-200'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block text-blue-600 font-bold">
            Ready for Pickup ({readyOrders.length})
          </span>
          <span className="text-2xl font-extrabold font-display tabular-nums block mt-1 text-blue-600">
            {readyOrders.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-emerald-200'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider block text-emerald-600 font-bold">
            Delivered ({completedOrders.length})
          </span>
          <span className="text-2xl font-extrabold font-display tabular-nums block mt-1 text-emerald-600">
            {completedOrders.length}
          </span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'active', label: 'In Kitchen & Dispatch' },
            { id: 'Order Placed', label: 'New Tickets' },
            { id: 'Preparing', label: 'On Griddle / Cooking' },
            { id: 'Ready for Pickup', label: 'Packed & Ready' },
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
            placeholder="Search Order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Refreshing kitchen line...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <ChefHat className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">No orders in this station</h3>
          <p className="text-xs text-zinc-500 mt-1">
            New customer orders will appear here instantaneously with full ticket specs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order.order_id;
            const isNew = order.current_status === 'Order Placed';
            const isPreparing = order.current_status === 'Preparing';
            const isReady = order.current_status === 'Ready for Pickup';
            const isOut = order.current_status === 'Out for Delivery';
            const isDelivered = order.current_status === 'Delivered';

            return (
              <div
                key={order.order_id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
                  isNew
                    ? 'border-orange-400 ring-2 ring-orange-200/50'
                    : isPreparing
                    ? 'border-amber-300'
                    : isReady
                    ? 'border-blue-300'
                    : 'border-zinc-200'
                }`}
              >
                {/* Header Strip */}
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/70 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900">{order.order_id}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Print Kitchen Ticket"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                        isNew
                          ? 'bg-orange-100 text-orange-700'
                          : isPreparing
                          ? 'bg-amber-100 text-amber-800'
                          : isReady
                          ? 'bg-blue-100 text-blue-800'
                          : isOut
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {order.current_status}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono tabular-nums">
                      {isDelivered ? 'Done' : `ETA: ~${order.eta_minutes}m`}
                    </span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="p-4 flex-1 space-y-4">
                  {/* Restaurant & Customer info */}
                  <div>
                    <div className="text-xs font-semibold text-zinc-800">{order.restaurant_name}</div>
                    <div className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5">
                      <span className="font-medium text-zinc-900">{order.customer_name}</span>
                      <span>·</span>
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span>{order.customer_phone}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Kitchen Items ({order.items?.length || order.itemCount || 1})
                    </span>
                    <div className="space-y-1.5">
                      {order.items?.map((it) => (
                        <div key={it.order_item_id} className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-900">
                            {it.quantity}x {it.item_name}
                          </span>
                          <span className="text-zinc-500 font-mono tabular-nums">
                            ${(it.price * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="pt-2 mt-2 border-t border-zinc-200/60 text-[11px] text-amber-800 font-medium">
                        Notes: {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* One-Click Action Buttons for Restaurant Staff */}
                <div className="p-4 border-t border-zinc-100 bg-zinc-50/40">
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.order_id, 'Preparing', 'Chef started preparing dish in kitchen.')}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Accept & Start Preparing</span>
                        </>
                      )}
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.order_id, 'Ready for Pickup', 'Food freshly cooked and sealed in thermal bag for courier.')}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Mark Ready for Pickup</span>
                        </>
                      )}
                    </button>
                  )}

                  {isReady && (
                    <div className="py-2 text-center text-xs font-semibold text-blue-700 bg-blue-50/80 rounded-xl border border-blue-200">
                      Food is on dispatch rack · Awaiting Courier
                    </div>
                  )}

                  {isOut && (
                    <div className="py-2 text-center text-xs font-semibold text-purple-700 bg-purple-50/80 rounded-xl border border-purple-200">
                      Courier is en route to customer
                    </div>
                  )}

                  {isDelivered && (
                    <div className="py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Order Delivered</span>
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
