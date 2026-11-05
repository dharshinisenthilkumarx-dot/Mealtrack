import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { X, Lock, Mail, User, Phone, MapPin, Users, UtensilsCrossed, Bike, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, switchDemoRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Full name is required.');
        if (!email.trim()) throw new Error('Email address is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });
      } else {
        if (!email.trim() || !password) throw new Error('Please enter both email and password.');
        await login(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoRole(demoRole);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              !isRegister
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              isRegister
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* 1-Click Demo Logins */}
        <div className="mb-6 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
            Instant Demo Account Sign-In
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('customer')}
              className="py-1.5 px-2 bg-white hover:bg-orange-50 hover:border-orange-300 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('restaurant')}
              className="py-1.5 px-2 bg-white hover:bg-orange-50 hover:border-orange-300 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
              <span>Kitchen Staff</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('delivery')}
              className="py-1.5 px-2 bg-white hover:bg-orange-50 hover:border-orange-300 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 transition-all text-center flex flex-col items-center gap-1 shadow-2xs"
            >
              <Bike className="w-3.5 h-3.5 text-orange-600" />
              <span>Courier Rider</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="customer">Customer (Order & Track Meals)</option>
                  <option value="restaurant">Restaurant Kitchen Staff</option>
                  <option value="delivery">Delivery Partner / Courier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Default Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="123 Street Ave, City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
