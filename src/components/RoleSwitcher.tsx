import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { api } from '../services/api';
import { Users, UtensilsCrossed, Bike, RefreshCw, CheckCircle2 } from 'lucide-react';

interface RoleSwitcherProps {
  onRefreshOrders?: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onRefreshOrders }) => {
  const { user, switchDemoRole } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRoleChange = async (role: UserRole) => {
    await switchDemoRole(role);
    if (onRefreshOrders) onRefreshOrders();
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all sample orders and data back to initial demo state?')) return;
    try {
      setResetting(true);
      await api.resetDemoData();
      setMessage('Demo data restored!');
      setTimeout(() => setMessage(null), 3000);
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 text-zinc-100 text-xs py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Role Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-400 font-medium shrink-0">Demo Role:</span>
          
          <button
            type="button"
            onClick={() => handleRoleChange('customer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
              user?.role === 'customer'
                ? 'bg-orange-500 text-white font-semibold shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer (Sarah)</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('restaurant')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
              user?.role === 'restaurant'
                ? 'bg-orange-500 text-white font-semibold shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Restaurant (Chef Marco)</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('delivery')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
              user?.role === 'delivery'
                ? 'bg-orange-500 text-white font-semibold shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery Courier (Alex)</span>
          </button>
        </div>

        {/* Right: Reset Data & Active Role Indicator */}
        <div className="flex items-center gap-4 shrink-0">
          {message && (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {message}
            </span>
          )}

          <button
            type="button"
            onClick={handleResetData}
            disabled={resetting}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            title="Reset database orders to clean demo baseline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
