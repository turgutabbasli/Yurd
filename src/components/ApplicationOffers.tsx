import React, { useState } from 'react';
import { Application, InvestorOffer } from '../types';
import { LABELS, formatMoney, formatDateAz, formatDurationMonths } from '../labels';
import { api } from '../api';
import { Handshake, Columns3, CheckCircle2, X, AlertCircle, Building2, Calendar, Sprout, MessageSquare } from 'lucide-react';

interface ApplicationOffersProps {
  application: Application;
  offers: InvestorOffer[];
  onSelected: (app: Application) => void;
}

export function offerTermsText(o: InvestorOffer): string {
  if (o.model === 'ICARE') {
    return `İcarə haqqı: ${formatMoney(o.leaseFeeAznPerYear || 0)} / il`;
  }
  return `Torpaq sahibinin payı: ${o.ownerSharePct ?? 0}%`;
}

export function offerStatusClass(status: InvestorOffer['status']): string {
  switch (status) {
    case 'QEBUL_EDILDI':
      return 'bg-[#2F6B3A]/10 text-[#2F6B3A] border-[#2F6B3A]/30';
    case 'REDD_EDILDI':
      return 'bg-[#C8553D]/10 text-[#C8553D] border-[#C8553D]/30';
    default:
      return 'bg-[#D98E04]/10 text-[#D98E04] border-[#D98E04]/30';
  }
}

export const ApplicationOffers: React.FC<ApplicationOffersProps> = ({ application, offers, onSelected }) => {
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirmOffer, setConfirmOffer] = useState<InvestorOffer | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSelect = application.status === 'QERAR_VERILIB' && application.outcome === 'TESDIQLENIB';
  const sorted = [...offers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSelect = async () => {
    if (!confirmOffer) return;
    setSelecting(true);
    setErrorMsg(null);
    try {
      const updated = await api.selectOffer(confirmOffer.id);
      setConfirmOffer(null);
      setCompareOpen(false);
      onSelected(updated);
    } catch (e: any) {
      setErrorMsg(e.message || LABELS.errorGeneral);
      setConfirmOffer(null);
    } finally {
      setSelecting(false);
    }
  };

  // Best value per metric, from the landowner's point of view
  const maxOf = (vals: Array<number | null | undefined>) => {
    const nums = vals.filter((v): v is number => typeof v === 'number');
    return nums.length ? Math.max(...nums) : null;
  };
  const bestAmount = maxOf(offers.map(o => o.amountAzn));
  const bestShare = maxOf(offers.map(o => (o.model === 'ICARE' ? null : o.ownerSharePct)));
  const bestLease = maxOf(offers.map(o => (o.model === 'ICARE' ? o.leaseFeeAznPerYear : null)));
  const bestDuration = maxOf(offers.map(o => o.durationMonths));

  const cell = (best: boolean) =>
    `py-2.5 px-3 align-top ${best ? 'bg-[#2F6B3A]/10 text-[#2F6B3A] font-extrabold' : 'text-[#1F2A24]'}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-extrabold text-[#1F2A24] text-sm flex items-center gap-2">
          <Handshake className="w-4 h-4 text-[#6B3FA0]" />
          <span>Gələn təkliflər</span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#6B3FA0]/10 text-[#6B3FA0] border border-[#6B3FA0]/30">
            {offers.length} təklif
          </span>
        </h3>
        {offers.length >= 2 && (
          <button
            onClick={() => setCompareOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#6B3FA0]/40 text-[#6B3FA0] text-xs font-bold hover:bg-[#6B3FA0]/10 cursor-pointer self-start"
          >
            <Columns3 className="w-4 h-4" />
            <span>Müqayisə et</span>
          </button>
        )}
      </div>

      {application.status === 'INVESTOR_SECILDI' && (
        <div className="p-3 rounded-xl bg-[#2F6B3A]/10 border border-[#2F6B3A]/30 text-xs text-[#1F2A24] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2F6B3A] shrink-0" />
          <span>İnvestor seçildi. Yeni təklif qəbulu bağlanıb.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {offers.length === 0 ? (
        <p className="text-xs text-[#7A5230] p-3.5 rounded-xl bg-[#F4EBDD]/30 border border-[#EADBC8]">
          {canSelect
            ? 'Hələ investor təklifi daxil olmayıb. Layihənizi investor vitrinində dərc etdikdən sonra təkliflər burada görünəcək.'
            : 'Bu müraciətə hələ investor təklifi daxil olmayıb.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map(o => (
            <div
              key={o.id}
              className={`p-4 rounded-2xl border-2 bg-white space-y-3 text-xs ${
                o.status === 'QEBUL_EDILDI' ? 'border-[#2F6B3A]' : 'border-[#EADBC8]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-sm text-[#1F2A24] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#6B3FA0]" />
                    <span>{o.company}</span>
                  </div>
                  <div className="text-[11px] text-[#7A5230]">{o.investorName}</div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${offerStatusClass(o.status)}`}>
                  {LABELS.offerStatus[o.status]}
                </span>
              </div>

              {o.profile && <p className="text-[11px] text-[#7A5230] leading-relaxed">{o.profile}</p>}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                  <span className="text-[#7A5230] block">İnvestisiya:</span>
                  <span className="font-extrabold text-[#1F2A24]">{formatMoney(o.amountAzn)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                  <span className="text-[#7A5230] block">Əməkdaşlıq modeli:</span>
                  <span className="font-extrabold text-[#1F2A24]">{LABELS.offerModels[o.model]}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                  <span className="text-[#7A5230] block">{o.model === 'ICARE' ? 'İcarə haqqı:' : 'Gəlir bölgüsü:'}</span>
                  <span className="font-extrabold text-[#1F2A24]">
                    {o.model === 'ICARE' ? `${formatMoney(o.leaseFeeAznPerYear || 0)} / il` : `Sizin payınız ${o.ownerSharePct ?? 0}%`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F4EBDD]/50 border border-[#EADBC8]">
                  <span className="text-[#7A5230] block">İcra müddəti:</span>
                  <span className="font-extrabold text-[#1F2A24]">{formatDurationMonths(o.durationMonths)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[#1F2A24]">
                <Sprout className="w-3.5 h-3.5 text-[#2F6B3A]" />
                <span>
                  Planlaşdırılan fəaliyyət: <b>{o.plannedActivity}</b>
                </span>
              </div>

              {o.message && (
                <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-[#6B3FA0]/5 border border-[#6B3FA0]/15 text-[#1F2A24]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#6B3FA0] mt-0.5 shrink-0" />
                  <span className="italic">&ldquo;{o.message}&rdquo;</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EADBC8]">
                <span className="text-[11px] text-[#7A5230] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateAz(o.createdAt)}</span>
                </span>
                {canSelect && o.status === 'GOZLEMEDE' && (
                  <button
                    onClick={() => setConfirmOffer(o)}
                    className="px-3.5 py-2 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-[11px] font-extrabold cursor-pointer"
                  >
                    Bu investoru seç
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side-by-side comparison */}
      {compareOpen && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBC8]">
              <div>
                <h3 className="text-lg font-extrabold text-[#1F2A24]">Təkliflərin müqayisəsi</h3>
                <p className="text-[11px] text-[#7A5230]">Yaşıl xanalar torpaq sahibi üçün daha sərfəli dəyəri göstərir.</p>
              </div>
              <button
                onClick={() => setCompareOpen(false)}
                className="p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
                title={LABELS.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#EADBC8]">
                    <th className="py-2.5 px-3 text-left text-[#7A5230] font-bold w-40">Göstərici</th>
                    {offers.map(o => (
                      <th key={o.id} className="py-2.5 px-3 text-left text-[#1F2A24] font-extrabold">
                        {o.company}
                        <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${offerStatusClass(o.status)}`}>
                          {LABELS.offerStatus[o.status]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADBC8]">
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">İnvestisiya məbləği</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(o.amountAzn === bestAmount)}>{formatMoney(o.amountAzn)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">Əməkdaşlıq modeli</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(false)}>{LABELS.offerModels[o.model]}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">Gəlir payınız</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(o.model !== 'ICARE' && o.ownerSharePct === bestShare)}>
                        {o.model === 'ICARE' ? '—' : `${o.ownerSharePct ?? 0}%`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">İllik icarə haqqı</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(o.model === 'ICARE' && o.leaseFeeAznPerYear === bestLease)}>
                        {o.model === 'ICARE' ? formatMoney(o.leaseFeeAznPerYear || 0) : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">İcra müddəti</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(o.durationMonths === bestDuration)}>{formatDurationMonths(o.durationMonths)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">Fəaliyyət</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(false)}>{o.plannedActivity}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#7A5230] font-bold">Göndərilib</td>
                    {offers.map(o => (
                      <td key={o.id} className={cell(false)}>{formatDateAz(o.createdAt)}</td>
                    ))}
                  </tr>
                  {canSelect && (
                    <tr>
                      <td className="py-2.5 px-3" />
                      {offers.map(o => (
                        <td key={o.id} className="py-2.5 px-3">
                          {o.status === 'GOZLEMEDE' && (
                            <button
                              onClick={() => setConfirmOffer(o)}
                              className="px-3 py-1.5 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-[11px] font-extrabold cursor-pointer"
                            >
                              Bu investoru seç
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {confirmOffer && (
        <div className="fixed inset-0 z-[60] modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-[#EADBC8] space-y-4 animate-in zoom-in-95">
            <h4 className="font-extrabold text-[#1F2A24] text-base">İnvestor seçimi</h4>
            <p className="text-xs text-[#1F2A24] leading-relaxed">
              Bu investoru seçmək istədiyinizə əminsiniz? Digər təkliflər avtomatik rədd ediləcək.
            </p>
            <div className="p-3 rounded-xl bg-[#F4EBDD]/60 border border-[#EADBC8] text-xs">
              <b>{confirmOffer.company}</b> · {formatMoney(confirmOffer.amountAzn)} · {LABELS.offerModels[confirmOffer.model]}
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setConfirmOffer(null)}
                className="px-4 py-2 rounded-xl border border-[#EADBC8] text-xs font-bold text-[#1F2A24] hover:bg-[#F4EBDD] cursor-pointer"
              >
                İmtina
              </button>
              <button
                onClick={handleSelect}
                disabled={selecting}
                className="px-5 py-2 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {selecting ? 'Seçilir…' : 'Bəli, seç'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
