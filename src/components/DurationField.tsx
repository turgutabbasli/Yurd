import React from 'react';
import { formatMonthsAsYears, formatEndMonth } from '../labels';
import { CalendarClock, AlertCircle } from 'lucide-react';

export const DURATION_MIN = 1;
export const DURATION_MAX = 600;

export function durationError(months: number | ''): string | null {
  if (months === '' || !Number.isFinite(months) || months <= 0) return 'İcra müddətini ay ilə daxil edin (ən azı 1 ay).';
  if (!Number.isInteger(months)) return 'İcra müddəti tam ay sayı olmalıdır.';
  if (months > DURATION_MAX) return `İcra müddəti ən çox ${DURATION_MAX} ay ola bilər.`;
  return null;
}

interface DurationFieldProps {
  months: number | '';
  onChange: (months: number | '') => void;
  startDate: string;
  inputClassName: string;
}

// "İcra müddəti" in months with a live years/months reading and the resulting end date
export const DurationField: React.FC<DurationFieldProps> = ({ months, onChange, startDate, inputClassName }) => {
  const error = durationError(months);
  const valid = !error && months !== '';
  const end = valid ? formatEndMonth(startDate, months as number) : '';

  return (
    <div>
      <label className="font-bold text-[#7A5230] block mb-1">İcra müddəti (ay) *</label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={1}
          value={months}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className={`${inputClassName} max-w-[120px]`}
        />
        <input
          type="range"
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={1}
          value={valid ? (months as number) : DURATION_MIN}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-[#2F6B3A] cursor-pointer"
          aria-label="İcra müddəti"
        />
      </div>
      {valid ? (
        <div className="mt-1.5 text-[11px] text-[#1F2A24] space-y-0.5">
          <div className="font-bold text-[#2F6B3A]">{formatMonthsAsYears(months as number)}</div>
          {end && (
            <div className="flex items-center gap-1 text-[#7A5230]">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Bitmə tarixi: {end}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] font-bold text-[#C8553D] flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
