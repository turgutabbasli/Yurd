import React, { useState } from 'react';
import { User } from '../types';
import { LABELS } from '../labels';
import { api } from '../api';
import { COUNTRIES } from '../data/countries';
import { X, AlertCircle, ArrowRight, ShieldCheck, IdCard, Globe } from 'lucide-react';

const PASSPORT_RE = /^[A-Za-z0-9]{6,12}$/;
const FIN_RE = /^[0-9A-Za-z]{7}$/;

interface MyGovLoginModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

// Demo simulation of a myGov sign-in step, drawn in the portal's own style (no real myGov integration)
export const MyGovLoginModal: React.FC<MyGovLoginModalProps> = ({ onSuccess, onClose }) => {
  const [tab, setTab] = useState<'citizen' | 'foreign'>('citizen');
  const [fin, setFin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const passportExpired = passportExpiry !== '' && passportExpiry < todayStr;
  const passportFormatBad = passportNumber !== '' && !PASSPORT_RE.test(passportNumber.trim());
  const finFormatBad = fin !== '' && !FIN_RE.test(fin.trim());

  const switchTab = (next: 'citizen' | 'foreign') => {
    setTab(next);
    setErrorMsg(null);
  };

  const handleCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fin.trim()) {
      setErrorMsg('FİN kodunu daxil edin.');
      return;
    }
    if (!FIN_RE.test(fin.trim())) {
      setErrorMsg('FİN kod 7 simvoldan (hərf və rəqəm) ibarət olmalıdır.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.loginWithFin(fin);
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || LABELS.errorGeneral);
    } finally {
      setLoading(false);
    }
  };

  const handleForeign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!firstName.trim() || !lastName.trim() || !citizenship || !passportNumber.trim() || !birthDate || !passportExpiry) {
      setErrorMsg('Bütün məcburi sahələri doldurun.');
      return;
    }
    if (!PASSPORT_RE.test(passportNumber.trim())) {
      setErrorMsg('Pasport nömrəsi 6–12 simvoldan ibarət olmalı və yalnız hərf və rəqəmlərdən ibarət olmalıdır.');
      return;
    }
    if (passportExpired) {
      setErrorMsg('Pasportun müddəti bitib. Giriş üçün etibarlı pasport tələb olunur.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.loginWithPassport({ firstName, lastName, citizenship, passportNumber, birthDate, passportExpiry });
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || LABELS.errorGeneral);
    } finally {
      setLoading(false);
    }
  };

  const label = 'block text-xs font-bold text-[#7A5230] mb-1.5';
  const input =
    'w-full px-4 py-3 rounded-xl border border-[#EADBC8] bg-white text-sm text-[#1F2A24] placeholder:text-[#7A5230]/50 focus:outline-none focus:border-[#2F6B3A] transition-colors';
  const submitBtn =
    'w-full py-3.5 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-[60] modal-backdrop flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBC8] space-y-5 animate-in zoom-in-95">
        {/* Demo label in the corner */}
        <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
          Demo rejimi
        </span>
        <button
          onClick={onClose}
          title={LABELS.close}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[#7A5230] hover:bg-[#F4EBDD] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pt-4 text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#2E6DB4]/10 text-[#2E6DB4] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1F2A24]">myGov ilə giriş</h2>
          <p className="text-xs text-[#7A5230]">
            Simulyasiya: real dövlət xidmətinə qoşulmur. Rolunuz hesabınızdan avtomatik müəyyən edilir.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#F4EBDD]/70 border border-[#EADBC8]">
          <button
            type="button"
            onClick={() => switchTab('citizen')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'citizen' ? 'bg-white text-[#2F6B3A] shadow-sm' : 'text-[#7A5230] hover:text-[#1F2A24]'
            }`}
          >
            <IdCard className="w-4 h-4" />
            <span>Azərbaycan vətəndaşı</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('foreign')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'foreign' ? 'bg-white text-[#2F6B3A] shadow-sm' : 'text-[#7A5230] hover:text-[#1F2A24]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Xarici vətəndaş</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {tab === 'citizen' ? (
          <form onSubmit={handleCitizen} noValidate className="space-y-4">
            <div>
              <label className={label}>FİN kod *</label>
              <input
                type="text"
                value={fin}
                maxLength={7}
                autoFocus
                onChange={e => {
                  setFin(e.target.value.toUpperCase());
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="7 simvol, məs: 1AB2C3D"
                className={`${input} font-mono tracking-widest`}
              />
              {finFormatBad && <span className="text-[11px] text-[#C8553D] font-bold mt-1 block">7 simvol, yalnız hərf və rəqəm</span>}
              <span className="text-[11px] text-[#7A5230] mt-1 block">FİN kod şəxsiyyət vəsiqəsinin ön tərəfində göstərilir.</span>
            </div>
            <button type="submit" disabled={loading} className={submitBtn}>
              {loading ? <span>Yoxlanılır…</span> : <><span>Daxil ol</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForeign} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Ad *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" className={input} />
              </div>
              <div>
                <label className={label}>Soyad *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className={input} />
              </div>
              <div>
                <label className={label}>Vətəndaşlıq *</label>
                <select value={citizenship} onChange={e => setCitizenship(e.target.value)} className={input}>
                  <option value="">Ölkə seçin…</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Pasport nömrəsi *</label>
                <input
                  type="text"
                  value={passportNumber}
                  maxLength={12}
                  onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                  placeholder="Məs: GB5478213"
                  className={`${input} font-mono`}
                />
                {passportFormatBad && <span className="text-[11px] text-[#C8553D] font-bold mt-1 block">6–12 simvol, yalnız hərf və rəqəm</span>}
              </div>
              <div>
                <label className={label}>Doğum tarixi *</label>
                <input type="date" value={birthDate} max={todayStr} onChange={e => setBirthDate(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Pasportun bitmə tarixi *</label>
                <input type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} className={input} />
                {passportExpired && (
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Pasportun müddəti bitib</span>
                  </span>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading} className={submitBtn}>
              {loading ? <span>Yoxlanılır…</span> : <><span>Daxil ol</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
