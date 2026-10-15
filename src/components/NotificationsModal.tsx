import React from 'react';
import { Notification } from '../types';
import { LABELS, formatDateAz } from '../labels';
import { X, Bell, Check, CheckCheck } from 'lucide-react';

interface NotificationsModalProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] space-y-4 max-h-[85vh] flex flex-col justify-between animate-in zoom-in-95">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#EADBC8]">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
                <Bell className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                {LABELS.notifications} ({notifications.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="flex justify-end pt-2 pb-1">
              <button
                onClick={onMarkAllRead}
                className="text-xs font-bold text-[#2F6B3A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{LABELS.markAllRead}</span>
              </button>
            </div>
          )}

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pt-1">
            {notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => onMarkRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-[#F4EBDD]/30 border-[#EADBC8] opacity-75'
                    : 'bg-white border-[#2F6B3A] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs text-[#1F2A24] leading-relaxed ${!notif.read ? 'font-bold' : ''}`}>
                    {notif.text}
                  </p>
                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2F6B3A] shrink-0 mt-1" />
                  )}
                </div>
                <div className="text-[10px] text-[#7A5230] mt-2 font-medium">
                  {formatDateAz(notif.createdAt)}
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="p-8 text-center text-xs text-[#7A5230]">
                Bildirişiniz yoxdur.
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold cursor-pointer"
          >
            {LABELS.close}
          </button>
        </div>
      </div>
    </div>
  );
};
