import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuth,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();
  const { totalItemsCount, setIsCartOpen } = useCart();

  const getNavLinks = () => {
    if (user?.role === 'restaurant') {
      return [
        { id: 'dashboard', label: 'Kitchen Overview' },
        { id: 'orders', label: 'Order Pipeline' },
        { id: 'menu', label: 'Menu Catalog' },
        { id: 'history', label: 'Completed Orders' },
      ];
    }
    if (user?.role === 'delivery') {
      return [
        { id: 'dashboard', label: 'Dispatch Center' },
        { id: 'orders', label: 'Active Runs' },
        { id: 'history', label: 'Delivery Logs' },
      ];
    }
    // Customer
    return [
      { id: 'dashboard', label: 'Explore & Order' },
      { id: 'tracker', label: 'Live Tracking' },
      { id: 'history', label: 'My Orders' },
      { id: 'analytics', label: 'Activity' },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setCurrentTab('dashboard')}
          className="text-left cursor-pointer whitespace-nowrap shrink-0 focus:outline-none"
        >
          <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-zinc-950">
            Order<span className="text-orange-600">Track</span>
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                  isActive
                    ? 'text-orange-600 font-semibold border-b-2 border-orange-600 -mb-0.5'
                    : 'hover:text-zinc-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action area */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Customer Cart button */}
          {user?.role === 'customer' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-zinc-700 hover:text-orange-600 transition-colors rounded-lg hover:bg-zinc-100"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                  {totalItemsCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 text-xs font-medium text-zinc-800 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="max-w-[110px] truncate">{user.name}</span>
                <span className="text-[10px] text-zinc-600 uppercase font-semibold">
                  ({user.role})
                </span>
              </button>

              <button
                onClick={logout}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden items-center justify-around border-t border-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 overflow-x-auto">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => setCurrentTab(link.id)}
            className={`px-2 py-1 whitespace-nowrap shrink-0 ${
              currentTab === link.id
                ? 'text-orange-600 font-semibold border-b-2 border-orange-600'
                : 'hover:text-zinc-900'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  );
};
