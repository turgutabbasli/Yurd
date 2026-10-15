import React, { useState } from 'react';
import { Application, Parcel } from '../types';
import { LABELS, formatArea, formatMoney } from '../labels';
import { api } from '../api';
import { X, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface PitchModalProps {
  application: Application;
  parcel: Parcel;
  onSuccess: () => void;
  onClose: () => void;
}

export const PitchModal: React.FC<PitchModalProps> = ({
  application,
  parcel,
  onSuccess,
  onClose
}) => {
  const [funding, setFunding] = useState<number>(300000);
  const [jobs, setJobs] = useState<number>(application.expectedJobs || 15);
  const [summary, setSummary] = useState<string>(
    `${parcel.name} ərazisində ${formatArea(parcel.areaHa)} torpaq sahəsində dövlət təsdiqli ${application.intendedCrop} layihəsi. Ərazi minalardan təmizlənib, suvarma şəbəkəsi və infrastruktur hazırlığı mövcuddur. İxrac və daxili bazar üçün birgə investisiya tərəfdaşlığı axtarılır.`
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await api.createListing({
        applicationId: application.id,
        parcelId: parcel.id,
        crop: application.intendedCrop,
        requiredFundingAzn: funding,
        expectedJobs: jobs,
        summary
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || LABELS.errorGeneral);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] space-y-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#EADBC8]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#6B3FA0]/10 text-[#6B3FA0]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">
                Layihəmi İnvestorlara Təqdim Et
              </h2>
              <p className="text-xs text-[#7A5230]">
                {parcel.name} · {application.number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#7A5230]">Torpaq sahəsi:</span>
              <span className="font-bold text-[#1F2A24]">{formatArea(parcel.areaHa)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A5230]">Təsdiqlənmiş bitki:</span>
              <span className="font-bold text-[#2F6B3A]">{application.intendedCrop}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">
                Tələb olunan vəsait (₼, Təxmini) *
              </label>
              <input
                type="number"
                required
                value={funding}
                onChange={e => setFunding(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
              />
            </div>

            <div>
              <label className="font-bold text-[#7A5230] block mb-1">
                Gözlənilən iş yeri (nəfər) *
              </label>
              <input
                type="number"
                required
                value={jobs}
                onChange={e => setJobs(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#7A5230] block mb-1">
              İnvestorlar üçün layihə xülasəsi (3–5 cümlə) *
            </label>
            <textarea
              rows={4}
              required
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white text-xs text-[#1F2A24] focus:outline-none focus:border-[#6B3FA0]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#EADBC8] font-bold text-xs text-[#1F2A24]"
            >
              {LABELS.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#6B3FA0] hover:bg-[#583286] text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Dərc edilir…' : 'Vitrinə yerləşdir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
