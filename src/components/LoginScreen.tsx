import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { MyGovLoginModal } from './MyGovLoginModal';
import { ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onUserLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUserLogin }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Gentle parallax: the landscape drifts a few pixels against the pointer (skipped for reduced motion / touch)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduce || !finePointer) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (e.clientX / window.innerWidth - 0.5) * -14;
        const y = (e.clientY / window.innerHeight - 0.5) * -10;
        scene.style.setProperty('--px', `${x.toFixed(1)}px`);
        scene.style.setProperty('--py', `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="login-screen relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Background: landscape line art with slow Ken Burns + parallax */}
      <div ref={sceneRef} className="login-scene absolute inset-0" aria-hidden="true">
        <div className="login-landscape absolute -inset-8" />
      </div>
      {/* Green → earth gradient keeps white text readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(160deg, rgba(36,84,46,0.88) 0%, rgba(47,107,58,0.78) 40%, rgba(92,70,40,0.80) 75%, rgba(122,82,48,0.88) 100%)'
        }}
      />
      {/* Thin drifting contour lines continuing the line-art style */}
      <svg className="login-contours absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="rgba(234,219,200,0.18)" strokeWidth="1.2">
          <path className="contour-a" d="M-50 620 C 200 560, 380 680, 620 610 S 1000 540, 1260 600" />
          <path className="contour-b" d="M-50 660 C 220 600, 400 720, 640 650 S 1020 580, 1260 640" />
          <path className="contour-a" d="M-50 210 C 160 260, 360 150, 600 200 S 980 270, 1260 190" />
          <path className="contour-b" d="M-50 250 C 180 300, 380 190, 620 240 S 1000 310, 1260 230" />
          <path className="contour-a" d="M-50 720 C 260 680, 460 780, 700 720 S 1060 660, 1260 710" />
        </g>
      </svg>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md sm:max-w-lg rounded-3xl border border-white/25 bg-white/12 backdrop-blur-xl shadow-2xl px-6 py-9 sm:px-10 sm:py-12 text-center text-white">
        <div className="w-20 h-20 mx-auto rounded-full bg-white p-1.5 shadow-lg ring-4 ring-white/20">
          <img src="/logo.webp" alt="Yurd loqosu" className="w-full h-full object-contain rounded-full" />
        </div>
        <div className="mt-3 text-xs font-bold tracking-[0.25em] uppercase text-emerald-100/90">Yurd</div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
          Doğma torpaqlarda <span className="text-[#EADBC8]">bərəkətli gələcək</span> qurun.
        </h1>

        <p className="mt-4 text-sm sm:text-base text-emerald-50/90 leading-relaxed">
          Sahibkar ən uyğun torpağı təqdim edir, investorlardan gələn təklifləri müqayisə edir və ən sərfəlisini seçir; investor etibarlı layihəyə sərmayə qoyur.
        </p>

        <button
          onClick={() => setModalOpen(true)}
          className="mt-8 w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#EADBC8] hover:bg-white text-[#1F2A24] font-extrabold text-base shadow-lg transition-all cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5 text-[#2E6DB4]" />
          <span>myGov ilə giriş</span>
        </button>
      </div>

      {modalOpen && (
        <MyGovLoginModal
          onClose={() => setModalOpen(false)}
          onSuccess={user => {
            setModalOpen(false);
            onUserLogin(user);
          }}
        />
      )}
    </div>
  );
};
