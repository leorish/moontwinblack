import React, { useState, useEffect, useRef } from 'react';
import { GARDEN_CONFIG } from '../garden/config';
import { ambientMusic } from '../utils/ambientAudio';

interface PasswordGateProps {
  onUnlock: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isDissolving, setIsDissolving] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Hint appears after 1 second
  useEffect(() => {
    const hintTimer = setTimeout(() => setShowHint(true), 1000);
    return () => clearTimeout(hintTimer);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Subtle drifting silver particles on lock screen canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // 25 gentle floating silver particles
    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.phase) * 0.2;
        p.phase += 0.02;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 225, 240, ${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldownRemaining > 0) return;

    const trimmed = password.trim();
    if (!trimmed) return;

    try {
      const enc = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(trimmed));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      if (hashHex === GARDEN_CONFIG.gate.passwordHash) {
        // Correct Password
        try {
          sessionStorage.setItem('garden_unlocked', 'true');
        } catch {
          // Ignore storage restrictions
        }

        // Tap serves as user gesture for Web Audio API
        ambientMusic.init(GARDEN_CONFIG.music.volume);

        setIsDissolving(true);
        setTimeout(() => {
          onUnlock();
        }, 1200);
      } else {
        // Wrong Password
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsShaking(true);
        setHasError(true);
        setPassword('');

        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => setHasError(false), 2400);

        if (nextAttempts >= 5) {
          setCooldownRemaining(30);
        } else {
          inputRef.current?.focus();
        }
      }
    } catch (err) {
      console.error('Password verification error', err);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050507] text-[#f0f0f5] overflow-hidden transition-all duration-[1200ms] ease-out ${
        isDissolving ? 'opacity-0 scale-105 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      {/* Background Deep-Red Breathing Glow */}
      <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-[radial-gradient(ellipse_at_bottom,_rgba(122,12,28,0.22)_0%,_rgba(42,5,8,0.08)_55%,_transparent_75%)] pointer-events-none animate-pulse duration-[6000ms]" />

      {/* Drifting silver particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Lock Gate Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 p-8 rounded-2xl bg-[#0c0d14]/80 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
        <div className="text-[11px] font-mono tracking-[0.35em] text-[#a0a0b8] uppercase mb-2">
          ENTER THE GARDEN
        </div>
        <div className="w-8 h-[1px] bg-white/15 mb-6" />

        <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
          <div
            className={`w-full flex items-center bg-[#151620] rounded-xl border transition-all duration-300 ${
              hasError
                ? 'border-[#8b1528] ring-2 ring-[#8b1528]/30'
                : 'border-white/15 focus-within:border-white/35 focus-within:ring-2 focus-within:ring-white/10'
            } ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          >
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={cooldownRemaining > 0}
              placeholder={cooldownRemaining > 0 ? 'Locked out...' : 'Enter password...'}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              className="w-full py-3.5 pl-4 pr-2 bg-transparent text-[16px] text-white placeholder-white/25 focus:outline-none disabled:opacity-50 font-serif"
            />

            {/* Show / Hide Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="p-2 text-white/40 hover:text-white/80 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>

            {/* Open Button */}
            <button
              type="submit"
              disabled={cooldownRemaining > 0 || !password.trim()}
              className="mr-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-[13px] font-mono tracking-wider text-white transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 border border-white/10"
            >
              <span>Open</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </button>
          </div>

          {/* Hint text appears after 1s fade-in */}
          <div
            className={`mt-4 text-[12px] italic text-[#8a8d9f] font-serif transition-opacity duration-700 ${
              showHint ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {GARDEN_CONFIG.gate.hint}
          </div>

          {/* Error Message */}
          <div
            className={`mt-2 text-[12px] text-[#e0566d] font-mono tracking-wide transition-opacity duration-300 ${
              hasError ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Not quite, try again
          </div>

          {/* Cooldown Timer */}
          {cooldownRemaining > 0 && (
            <div className="mt-2 text-[12px] font-mono text-[#d28b99]">
              Too many attempts. Try again in {cooldownRemaining}s
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
