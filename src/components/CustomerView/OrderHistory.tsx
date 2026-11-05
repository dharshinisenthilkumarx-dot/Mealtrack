import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';
import { ReceiptModal } from '../ReceiptModal';
import { Search, Clock, ArrowRight, CheckCircle2, ChevronRight, Package, AlertCircle, Printer } from 'lucide-react';

interface OrderHistoryProps {
  onTrackOrder: (orderId: string) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onTrackOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setOrders(data);
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const unsubscribe = api.subscribeToOrderUpdates(() => {
      fetchOrders();
    });

    return () => {
      unsubscribe();
    };
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Order Placed':
        return <span className="text-zinc-600 font-semibold">Order Placed</span>;
      case 'Preparing':
        return <span className="text-amber-600 font-semibold">Preparing in Kitchen</span>;
      case 'Ready for Pickup':
        return <span className="text-blue-600 font-semibold">Ready for Pickup</span>;
      case 'Out for Delivery':
        return <span className="text-orange-600 font-semibold">Out for Delivery</span>;
      case 'Delivered':
        return <span className="text-emerald-600 font-semibold">Delivered</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 font-display">
            Order Activity & History
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review past meals and monitor your ongoing live orders.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'Order Placed', label: 'Placed' },
          { id: 'Preparing', label: 'Preparing' },
          { id: 'Ready for Pickup', label: 'Ready for Pickup' },
          { id: 'Out for Delivery', label: 'Out for Delivery' },
          { id: 'Delivered', label: 'Delivered' },
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

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Loading order history...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <Package className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">No matching orders found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filter tab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDelivered = order.current_status === 'Delivered';
            return (
              <div
                key={order.order_id}
                className="bg-white rounded-2xl border border-zinc-200 p-5 hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                    <span className="font-mono font-bold text-zinc-900">{order.order_id}</span>
                    <span>·</span>
                    <span>{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    {getStatusBadge(order.current_status)}
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 font-display">
                    {order.restaurant_name}
                  </h3>

                  <div className="text-xs text-zinc-600 line-clamp-1">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it) => `${it.quantity}x ${it.item_name}`).join(', ')
                    ) : (
                      <span>{order.itemCount || 1} items</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                    <span className="font-mono tabular-nums font-bold text-zinc-900">
                      Total: ${order.total_amount.toFixed(2)}
                    </span>
                    <span>·</span>
                    <span>
                      {isDelivered
                        ? 'Delivered'
                        : `Estimated arrival: ~${order.eta_minutes} mins`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setReceiptOrder(order)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
                    title="Print Receipt"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Receipt</span>
                  </button>

                  <button
                    onClick={() => onTrackOrder(order.order_id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                  >
                    <span>{isDelivered ? 'View Live Details' : 'Track Order Live'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Receipt Modal */}
      <OrderReceiptModal
        order={receiptOrder}
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
