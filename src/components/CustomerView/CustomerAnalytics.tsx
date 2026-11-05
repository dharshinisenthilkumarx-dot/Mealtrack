import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AnalyticsStats, Order } from '../../types';
import { Package, Clock, CheckCircle2, DollarSign, ArrowRight } from 'lucide-react';

interface CustomerAnalyticsProps {
  onTrackOrder: (orderId: string) => void;
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ onTrackOrder }) => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const s = await api.getAnalytics();
        setStats(s);
        const all = await api.getOrders();
        setActiveOrders(all.filter((o) => o.current_status !== 'Delivered'));
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Calculating order metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-zinc-900 font-display">
          Customer Activity Dashboard
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Monitor your ordering habits, active fulfillment runs, and completed meals.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-medium">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 font-display tabular-nums">
            {stats.totalOrders}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Lifetime orders placed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-medium">
            <span>In-Flight Orders</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold text-orange-600 font-display tabular-nums">
            {stats.activeOrders}
          </div>
          <span className="text-[11px] text-orange-700/80 mt-1 block">Currently on route or prep</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-medium">
            <span>Completed Meals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-display tabular-nums">
            {stats.delivered}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Delivered successfully</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-medium">
            <span>Total Food Spend</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 font-display tabular-nums">
            ${stats.totalRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Including taxes & delivery</span>
        </div>
      </div>

      {/* Active Orders Quick Navigation */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-8">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-xs mb-4">
          Active Live Deliveries ({activeOrders.length})
        </h3>

        {activeOrders.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-4">No in-flight orders right now.</p>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div
                key={order.order_id}
                className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 hover:bg-orange-50/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900">{order.order_id}</span>
                    <span className="text-xs font-medium text-orange-600">· {order.current_status}</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5">{order.restaurant_name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Estimated arrival: ~{order.eta_minutes} mins</div>
                </div>

                <button
                  onClick={() => onTrackOrder(order.order_id)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Track Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
