import React, { useState } from 'react';
import { ProjectListing, Parcel, OfferModel, User } from '../types';
import { LABELS, formatArea } from '../labels';
import { api } from '../api';
import { X, Handshake, AlertCircle } from 'lucide-react';
import { DurationField, durationError } from './DurationField';

function firstOfNextMonth(): string {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}

interface OfferFormModalProps {
  listing: ProjectListing;
  parcel: Parcel;
  cropName: string;
  currentUser: User;
  onSuccess: () => void;
  onClose: () => void;
}

export const OfferFormModal: React.FC<OfferFormModalProps> = ({ listing, parcel, cropName, currentUser, onSuccess, onClose }) => {
  const [company, setCompany] = useState(currentUser.fullName);
  const [profile, setProfile] = useState('');
  const [amount, setAmount] = useState<number>(listing.requiredFundingAzn);
  const [model, setModel] = useState<OfferModel>('GELIR_BOLGUSU');
  const [ownerShare, setOwnerShare] = useState<number>(40);
  const [leaseFee, setLeaseFee] = useState<number>(Math.round(parcel.areaHa * 250));
  const [durationMonths, setDurationMonths] = useState<number | ''>(120);
  const [startDate, setStartDate] = useState<string>(firstOfNextMonth());
  const [activity, setActivity] = useState(`Bağçılıq — ${cropName}`);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const durErr = durationError(durationMonths);
    if (durErr) {
      setErrorMsg(durErr);
      return;
    }
    setSubmitting(true);
    try {
      await api.createOffer({
        applicationId: listing.applicationId,
        amountAzn: amount,
        model,
        ownerSharePct: model === 'ICARE' ? null : ownerShare,
        leaseFeeAznPerYear: model === 'ICARE' ? leaseFee : null,
        durationMonths: durationMonths as number,
        startDate,
        plannedActivity: activity,
        message,
        company,
        profile
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || LABELS.errorGeneral);
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-bold text-sm text-[#1F2A24]';

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#EADBC8]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#6B3FA0]/10 text-[#6B3FA0]">
              <Handshake className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#1F2A24]">Torpaq sahibinə təklif göndər</h2>
              <p className="text-xs text-[#7A5230]">
                {parcel.name} · {formatArea(parcel.areaHa)} · {cropName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">Şirkət / ad *</label>
              <input type="text" required value={company} onChange={e => setCompany(e.target.value)} className={input} />
            </div>
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">İnvestisiya məbləği (₼) *</label>
              <input type="number" required min={1} value={amount} onChange={e => setAmount(Number(e.target.value))} className={input} />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#7A5230] block mb-1">Qısa profil</label>
            <input
              type="text"
              value={profile}
              onChange={e => setProfile(e.target.value)}
              placeholder="Məsələn: bağçılıq layihələrində 5 illik təcrübə"
              className={input}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">Əməkdaşlıq modeli *</label>
              <select value={model} onChange={e => setModel(e.target.value as OfferModel)} className={input}>
                {(Object.keys(LABELS.offerModels) as OfferModel[]).map(k => (
                  <option key={k} value={k}>
                    {LABELS.offerModels[k]}
                  </option>
                ))}
              </select>
            </div>
            {model === 'ICARE' ? (
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">İllik icarə haqqı (₼) *</label>
                <input type="number" required min={1} value={leaseFee} onChange={e => setLeaseFee(Number(e.target.value))} className={input} />
              </div>
            ) : (
              <div>
                <label className="font-bold text-[#7A5230] block mb-1">Torpaq sahibinin gəlir payı (%) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={99}
                  value={ownerShare}
                  onChange={e => setOwnerShare(Number(e.target.value))}
                  className={input}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">Başlama tarixi *</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={input} />
            </div>
            <div>
              <label className="font-bold text-[#7A5230] block mb-1">Planlaşdırılan fəaliyyət *</label>
              <input type="text" required value={activity} onChange={e => setActivity(e.target.value)} className={input} />
            </div>
          </div>

          <DurationField months={durationMonths} onChange={setDurationMonths} startDate={startDate} inputClassName={input} />

          <div>
            <label className="font-bold text-[#7A5230] block mb-1">Torpaq sahibinə mesaj</label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Təklifinizin üstünlüklərini qısa yazın"
              className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white text-xs text-[#1F2A24] focus:outline-none focus:border-[#6B3FA0]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#EADBC8] font-bold text-xs text-[#1F2A24] cursor-pointer">
              {LABELS.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#6B3FA0] hover:bg-[#583286] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Göndərilir…' : 'Təklifi göndər'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
