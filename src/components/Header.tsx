import React, { useState } from 'react';
import { User, Notification } from '../types';
import { LABELS } from '../labels';
import { Bell, LogOut, HelpCircle, UserCheck, ShieldCheck, Briefcase, TrendingUp, Check } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  notifications: Notification[];
  onLogout: () => void;
  onOpenFaq: () => void;
  onOpenNotifications: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  notifications,
  onLogout,
  onOpenFaq,
  onOpenNotifications,
  onNavigateHome
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleIcon = () => {
    if (!user) return null;
    switch (user.role) {
      case 'SAHIBKAR':
        return <Briefcase className="w-4 h-4 text-[#2F6B3A]" />;
      case 'INVESTOR':
        return <TrendingUp className="w-4 h-4 text-[#6B3FA0]" />;
      case 'OPERATOR':
        return <UserCheck className="w-4 h-4 text-[#7A5230]" />;
      case 'TESDIQLEYICI':
        return <ShieldCheck className="w-4 h-4 text-[#2E6DB4]" />;
    }
  };

  const getRoleBadgeClass = () => {
    if (!user) return '';
    switch (user.role) {
      case 'SAHIBKAR':
        return 'bg-[#2F6B3A]/10 text-[#2F6B3A] border-[#2F6B3A]/30';
      case 'INVESTOR':
        return 'bg-[#6B3FA0]/10 text-[#6B3FA0] border-[#6B3FA0]/30';
      case 'OPERATOR':
        return 'bg-[#7A5230]/10 text-[#7A5230] border-[#7A5230]/30';
      case 'TESDIQLEYICI':
        return 'bg-[#2E6DB4]/10 text-[#2E6DB4] border-[#2E6DB4]/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EADBC8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2F6B3A] text-white flex items-center justify-center font-bold text-xl shadow-xs group-hover:bg-[#26572F] transition-colors p-[3px]">
            <img src="/logo.webp" alt="Yurd loqosu" className="w-full h-full object-contain rounded-[9px] bg-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-[#1F2A24]">Yurd</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2F6B3A]/10 text-[#2F6B3A] border border-[#2F6B3A]/20">
                MVP
              </span>
            </div>
            <p className="text-xs text-[#7A5230] font-medium hidden sm:block">
              İşğaldan Azad Edilmiş Ərazilərdə Torpaq Müsabiqələri
            </p>
          </div>
        </div>

        {/* Right Nav / Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* FAQ / Kömək */}
          <button
            onClick={onOpenFaq}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#7A5230] hover:text-[#1F2A24] hover:bg-[#F4EBDD]/60 rounded-xl transition-colors cursor-pointer"
            title="Kömək və Tez-tez verilən suallar"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden md:inline">Kömək</span>
          </button>

          {user ? (
            <>
              {/* Notifications Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 text-[#1F2A24] hover:bg-[#F4EBDD]/60 rounded-xl transition-colors cursor-pointer"
                title={LABELS.notifications}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#C8553D] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile / Role Badge */}
              <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-[#EADBC8]">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-bold text-[#1F2A24] leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-[#7A5230] font-medium">
                    {user.isForeign ? `Pasport: ${user.passportNumber || ''}` : `FİN: ${user.fin}`}
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${getRoleBadgeClass()}`}>
                  {getRoleIcon()}
                  <span>{LABELS.roles[user.role]}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#C8553D] hover:bg-[#C8553D]/10 rounded-xl transition-colors cursor-pointer"
                  title={LABELS.logout}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">{LABELS.logout}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#7A5230] italic hidden sm:block">
              Sınaq mühiti
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
