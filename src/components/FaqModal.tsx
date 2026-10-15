import React, { useState } from 'react';
import { LABELS } from '../labels';
import { api } from '../api';
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqModalProps {
  onClose: () => void;
}

export const FaqModal: React.FC<FaqModalProps> = ({ onClose }) => {
  const faqData = api.getFaq();
  const [selectedRole, setSelectedRole] = useState<'HAMISI' | 'SAHIBKAR' | 'INVESTOR' | 'NAZIRLIK'>('HAMISI');
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const filteredFaq = faqData.filter(item => {
    if (selectedRole === 'HAMISI') return true;
    return item.role === selectedRole;
  });

  const toggle = (idx: number) => {
    if (openIndices.includes(idx)) {
      setOpenIndices(openIndices.filter(i => i !== idx));
    } else {
      setOpenIndices([...openIndices, idx]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] space-y-6 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#EADBC8]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#2F6B3A]/10 text-[#2F6B3A]">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                Kömək və Tez-tez Verilən Suallar
              </h2>
              <p className="text-xs text-[#7A5230]">
                Müsabiqə, torpaq seçimi, sənədləşmə və dörd göz qaydası haqqında məlumatlar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setSelectedRole('HAMISI')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              selectedRole === 'HAMISI' ? 'bg-[#2F6B3A] text-white' : 'bg-[#F4EBDD] text-[#7A5230]'
            }`}
          >
            Bütün suallar
          </button>
          <button
            onClick={() => setSelectedRole('SAHIBKAR')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              selectedRole === 'SAHIBKAR' ? 'bg-[#2F6B3A] text-white' : 'bg-[#F4EBDD] text-[#7A5230]'
            }`}
          >
            Sahibkarlar üçün
          </button>
          <button
            onClick={() => setSelectedRole('INVESTOR')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              selectedRole === 'INVESTOR' ? 'bg-[#6B3FA0] text-white' : 'bg-[#F4EBDD] text-[#7A5230]'
            }`}
          >
            İnvestorlar üçün
          </button>
          <button
            onClick={() => setSelectedRole('NAZIRLIK')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              selectedRole === 'NAZIRLIK' ? 'bg-[#7A5230] text-white' : 'bg-[#F4EBDD] text-[#7A5230]'
            }`}
          >
            Nazirlik və EKTİS
          </button>
        </div>

        {/* Questions list */}
        <div className="space-y-3">
          {filteredFaq.map((item, idx) => {
            const isOpen = openIndices.includes(idx);
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#F4EBDD]/40 border border-[#EADBC8] space-y-2"
              >
                <div
                  onClick={() => toggle(idx)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <span className="font-bold text-sm text-[#1F2A24] pr-2">
                    {item.question}
                  </span>
                  <span className="text-[#7A5230]">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
                {isOpen && (
                  <p className="text-xs text-[#1F2A24]/90 pt-1 border-t border-[#EADBC8]/70 leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#2F6B3A] text-white text-xs font-bold cursor-pointer"
          >
            {LABELS.close}
          </button>
        </div>
      </div>
    </div>
  );
};
