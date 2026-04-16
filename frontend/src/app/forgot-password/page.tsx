'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, ShieldCheck, Lock, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Step = 'email' | 'otp' | 'password' | 'done';

/* ─── Step indicator ────────────────────────────────────────────────────── */
const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4" /> },
  { id: 'otp',      label: 'Verify',   icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'password', label: 'Reset',    icon: <Lock className="w-4 h-4" /> },
];

const stepIndex: Record<Step, number> = { email: 0, otp: 1, password: 2, done: 3 };

/* ─── Fade/slide variant ────────────────────────────────────────────────── */
const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.25 } },
};


/* ─── OTP digit input ───────────────────────────────────────────────────── */
function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');


  const handleKey = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.map((d, i) => (i === idx ? '' : d));
      onChange(next.join('').trimEnd());
      if (idx > 0) refs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, i) => (i === idx ? char : d));
    onChange(next.join(''));
    if (char && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] ?? ''}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          className={`w-12 h-14 text-center text-2xl font-bold bg-zinc-900 border-2 rounded-lg
            outline-none transition-all duration-200 caret-transparent
            ${digits[i] ? 'border-white text-white' : 'border-zinc-700 text-zinc-600'}
            focus:border-white focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]`}
        />
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep]               = useState<Step>('email');
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  /* countdown for resend */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const clearError = () => setError('');

  /* ── Step 1: Request OTP ── */
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    try {
      await api.post('/forgot-password', { email });
      setStep('otp');
      setResendCooldown(60);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    clearError();
    try {
      await api.post('/forgot-password', { email });
      setOtp('');
      setResendCooldown(60);
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    setIsLoading(true);
    clearError();
    try {
      await api.post('/verify-otp', { email, otp });
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired code.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 3: Reset password ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPass) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    clearError();
    try {
      await api.post('/reset-password-otp', { email, otp, new_password: newPassword });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. Please restart the process.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentIdx = stepIndex[step];

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center
                     selection:bg-white selection:text-black font-sans relative overflow-hidden">

      {/* Ambient background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[900px] h-[600px] bg-white/4 blur-[160px] rounded-full" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-violet-900/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-16 right-1/4 w-48 h-48 bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
      <div className="absolute top-10 left-10 z-50">
        <FolioLogo iconSize={24} />
      </div>

        {/* Step indicators (only show during active steps, not done) */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((s, i) => {
              const done    = i < currentIdx;
              const active  = i === currentIdx;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                  text-xs uppercase tracking-widest font-semibold transition-all duration-300
                                  ${active  ? 'bg-white text-black' :
                                    done    ? 'text-zinc-400' :
                                              'text-zinc-700'}`}>
                    <span className={`transition-colors ${done ? 'text-zinc-400' : ''}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.icon}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-8 h-px mx-1 transition-colors duration-500
                                    ${i < currentIdx ? 'bg-zinc-600' : 'bg-zinc-800'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <motion.div
          layout
          transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
          className="bg-[#0a0a0a] border border-zinc-800/60 rounded-2xl shadow-2xl
                     backdrop-blur-xl overflow-hidden"
        >
          <AnimatePresence mode="wait">

            {/* ══ Step 1: Email ══ */}
            {step === 'email' && (
              <motion.div key="email" {...fadeSlide} className="p-10">
                <div className="mb-8 text-center">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl
                                  flex items-center justify-center mx-auto mb-5">
                    <Mail className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">Recover Access</h2>
                  <p className="text-zinc-500 text-sm">
                    Enter your email and we&apos;ll send you a one-time recovery code.
                  </p>
                </div>

                <form onSubmit={handleRequestOTP} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="recovery-email"
                           className="text-xs uppercase tracking-[0.18em] font-semibold text-zinc-500">
                      Email Address
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); clearError(); }}
                      required
                      autoFocus
                      className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-500
                                 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200
                                 placeholder-zinc-700 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]"
                      placeholder="you@studio.com"
                    />
                  </div>

                  {error && <ErrorBanner message={error} />}

                  <button
                    id="send-otp-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black hover:bg-zinc-100 active:bg-zinc-200
                               transition duration-200 font-bold uppercase tracking-widest text-xs
                               rounded-xl flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Send Recovery Code'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-900 flex justify-center">
                  <Link href="/login"
                        className="flex items-center gap-2 text-zinc-600 hover:text-white transition group">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs uppercase tracking-widest">Back to login</span>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ══ Step 2: OTP Verification ══ */}
            {step === 'otp' && (
              <motion.div key="otp" {...fadeSlide} className="p-10">
                <div className="mb-8 text-center">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl
                                  flex items-center justify-center mx-auto mb-5">
                    <ShieldCheck className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">Enter Your Code</h2>
                  <p className="text-zinc-500 text-sm">
                    A 6-digit code was sent to{' '}
                    <span className="text-zinc-300 font-medium">{email}</span>.
                    <br />It expires in <span className="text-zinc-300">10 minutes</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <OTPInput value={otp} onChange={v => { setOtp(v); clearError(); }} />

                  {error && <ErrorBanner message={error} />}

                  <button
                    id="verify-otp-btn"
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="w-full py-4 bg-white text-black hover:bg-zinc-100
                               transition duration-200 font-bold uppercase tracking-widest text-xs
                               rounded-xl flex justify-center items-center gap-2
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Verify Code'}
                  </button>
                </form>

                {/* Resend */}
                <div className="mt-6 pt-6 border-t border-zinc-900 text-center space-y-3">
                  <p className="text-xs text-zinc-600">Didn&apos;t receive it?</p>
                  <button
                    id="resend-otp-btn"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isLoading}
                    className="flex items-center gap-1.5 mx-auto text-xs text-zinc-400
                               hover:text-white transition disabled:text-zinc-700 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin-slow' : ''}`} />
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend code'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ Step 3: New Password ══ */}
            {step === 'password' && (
              <motion.div key="password" {...fadeSlide} className="p-10">
                <div className="mb-8 text-center">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl
                                  flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">Set New Password</h2>
                  <p className="text-zinc-500 text-sm">
                    Choose a strong password for your account.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="new-password"
                           className="text-xs uppercase tracking-[0.18em] font-semibold text-zinc-500">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); clearError(); }}
                      required
                      autoFocus
                      minLength={8}
                      className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-500
                                 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200
                                 placeholder-zinc-700 tracking-wider
                                 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]"
                      placeholder="Minimum 8 characters"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password"
                           className="text-xs uppercase tracking-[0.18em] font-semibold text-zinc-500">
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPass}
                      onChange={e => { setConfirmPass(e.target.value); clearError(); }}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-zinc-500
                                 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200
                                 placeholder-zinc-700 tracking-wider
                                 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]"
                      placeholder="••••••••"
                    />
                  </div>

                  {/* Password strength hint */}
                  <PasswordStrength password={newPassword} />

                  {error && <ErrorBanner message={error} />}

                  <button
                    id="confirm-reset-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black hover:bg-zinc-100
                               transition duration-200 font-bold uppercase tracking-widest text-xs
                               rounded-xl flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Reset Password'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ══ Done ══ */}
            {step === 'done' && (
              <motion.div key="done" {...fadeSlide} className="p-10 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full
                             flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-2xl font-black tracking-tight mb-2">Password Reset</h2>
                <p className="text-zinc-500 text-sm mb-8">
                  Your account password has been updated successfully.<br />
                  You can now log in with your new credentials.
                </p>

                <button
                  id="goto-login-btn"
                  onClick={() => router.push('/login')}
                  className="w-full max-w-xs mx-auto py-4 bg-white text-black hover:bg-zinc-100
                             transition duration-200 font-bold uppercase tracking-widest text-xs
                             rounded-xl flex justify-center items-center gap-2"
                >
                  Go to Login
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-red-400 bg-red-500/8 border border-red-500/20
                 rounded-xl py-3 px-4 text-center font-mono"
    >
      {message}
    </motion.div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 chars',      pass: password.length >= 8 },
    { label: 'Uppercase letter',       pass: /[A-Z]/.test(password) },
    { label: 'Number or symbol',       pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3">
      {checks.map(c => (
        <div key={c.label}
             className={`flex items-center gap-1 text-[10px] font-medium transition-colors
                         ${c.pass ? 'text-emerald-500' : 'text-zinc-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.pass ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
          {c.label}
        </div>
      ))}
    </div>
  );
}
