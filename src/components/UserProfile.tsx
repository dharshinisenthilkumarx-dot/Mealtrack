import React from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Mail, Shield, Phone, MapPin, LogOut } from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold font-display">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 font-display">
              {user.name}
            </h2>
            <span className="text-xs uppercase font-semibold text-orange-600">
              Role: {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-zinc-600 border-t border-b border-zinc-100 py-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-zinc-800 font-medium">{user.email}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-zinc-800 capitalize">{user.role} Account Status: Active</span>
          </div>

          {user.phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-800">{user.phone}</span>
            </div>
          )}

          {user.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span className="text-zinc-800">{user.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex-1 py-2 px-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
