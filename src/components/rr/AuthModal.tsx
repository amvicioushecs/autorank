import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Mail, Lock, User, Phone, Loader2, Factory, AlertCircle, CheckCircle2 } from 'lucide-react';

const CRM_URL = 'https://famous.ai/api/crm/6a19aa7e9b69056178b8830a/subscribe';

const AuthModal: React.FC = () => {
  const { authOpen, authMode, closeAuth, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(authMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authOpen) { setMode(authMode); setError(null); setInfo(null); setPassword(''); }
  }, [authOpen, authMode]);

  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (mode !== 'reset' && password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password, name);
        fetch(CRM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: name || undefined,
            phone: phone.trim() || undefined,
            sms_opt_in: smsOptIn === true,
            source: 'join',
            tags: ['operator-signup', 'rankforge'],
          }),
        }).catch(() => {});
        if (needsConfirmation) setInfo('Account created. Check your inbox to confirm your email, then sign in.');
      } else {
        await resetPassword(email);
        setInfo('Password reset link sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeAuth}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0a0e1a] shadow-2xl shadow-sky-500/10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500" />
        <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
              <Factory className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">
                {mode === 'signin' ? 'Sign in to RankForge' : mode === 'signup' ? 'Create your factory' : 'Reset password'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'signup' ? 'Your own private portfolio of digital real estate' : 'Operator access to your autonomous agents'}
              </p>
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg mb-5 border border-slate-800">
              {(['signin', 'signup'] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError(null); setInfo(null); }}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={input} />
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={input} autoComplete="email" />
            </div>
            {mode === 'signup' && (
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (optional)" aria-label="Phone number (optional)" className={input} />
              </div>
            )}
            {mode !== 'reset' && (
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className={input} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
              </div>
            )}
            {mode === 'signup' && (
              <label className="flex items-start gap-2 text-[11px] text-slate-400 leading-snug cursor-pointer">
                <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 accent-sky-500" />
                Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
              </label>
            )}

            {error && <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
            {info && <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5"><CheckCircle2 className="w-4 h-4 shrink-0" />{info}</div>}

            <button type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-900 font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60 hover:shadow-lg hover:shadow-sky-500/25 transition-all">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            {mode === 'signin' && <button onClick={() => setMode('reset')} className="hover:text-sky-400">Forgot password?</button>}
            {mode === 'reset' && <button onClick={() => setMode('signin')} className="hover:text-sky-400">Back to sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
