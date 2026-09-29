import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { completePasswordReset, requestPasswordReset, resendVerification } from '../services/api';

const institutionalEmail = /^[^@\s]+@brokenshire\.edu\.ph$/i;

function Frame({ icon, eyebrow, title, description, children }: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-100">{icon}</div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-emerald-50/75">{description}</p>
      {children}
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/15 bg-black/10 px-3.5 py-3 text-left text-[11px] leading-4 text-emerald-50/75">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200" />
        Recovery requests always return the same response and never disclose whether an account exists.
      </div>
    </div>
  );
}

function Message({ error, children }: { error?: boolean; children: React.ReactNode }) {
  return <div role="status" className={`mt-5 rounded-xl border px-4 py-3 text-left text-sm ${error ? 'border-rose-300/30 bg-rose-950/40 text-rose-100' : 'border-emerald-200/25 bg-emerald-950/35 text-emerald-100'}`}>{children}</div>;
}

const inputClass = 'mt-2 h-11 w-full rounded-xl border border-white/20 bg-white/95 px-3.5 text-sm text-slate-900 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30';
const buttonClass = 'brand-button mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!institutionalEmail.test(email)) return setError('Use your @brokenshire.edu.ph email.');
    setBusy(true);
    try { setMessage((await requestPasswordReset(email)).message); }
    catch { setMessage('If an eligible account exists, password reset instructions will be sent.'); }
    finally { setBusy(false); }
  }

  return (
    <Frame icon={<Mail className="h-7 w-7" />} eyebrow="Account recovery" title="Forgot your password?" description="Enter your institutional email. If it belongs to an eligible account, we’ll send a one-time reset link.">
      {message ? <Message>{message}</Message> : (
        <form onSubmit={submit} className="mt-6 text-left">
          <label htmlFor="recovery-email" className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/80">Institutional email</label>
          <input id="recovery-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {error && <Message error>{error}</Message>}
          <button className={buttonClass} disabled={busy}>{busy ? 'Sending…' : 'Send reset instructions'} <ArrowRight className="h-4 w-4" /></button>
        </form>
      )}
      <Link className="mt-5 inline-block text-sm font-semibold text-cyan-100 hover:text-white" to="/login">Return to sign in</Link>
    </Frame>
  );
}

export function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!institutionalEmail.test(email)) return setError('Use your @brokenshire.edu.ph email.');
    setBusy(true);
    try { setMessage((await resendVerification(email)).message); }
    catch { setMessage('If an unverified account is eligible, a verification email will be sent.'); }
    finally { setBusy(false); }
  }

  return (
    <Frame icon={<Mail className="h-7 w-7" />} eyebrow="Account activation" title="Resend verification" description="Request a fresh, single-use activation link for your institutional account.">
      {message ? <Message>{message}</Message> : (
        <form onSubmit={submit} className="mt-6 text-left">
          <label htmlFor="verification-email" className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/80">Institutional email</label>
          <input id="verification-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {error && <Message error>{error}</Message>}
          <button className={buttonClass} disabled={busy}>{busy ? 'Sending…' : 'Send verification email'} <ArrowRight className="h-4 w-4" /></button>
        </form>
      )}
      <Link className="mt-5 inline-block text-sm font-semibold text-cyan-100 hover:text-white" to="/login">Return to sign in</Link>
    </Frame>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return setError('This password reset link is invalid or expired.');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try { setMessage((await completePasswordReset(token, password)).message); }
    catch { setError('This password reset link is invalid or expired. Request a new one.'); }
    finally { setBusy(false); }
  }

  return (
    <Frame icon={message ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />} eyebrow="Account recovery" title={message ? 'Password updated' : 'Choose a new password'} description={message ? 'Your previous sessions have been signed out for safety.' : 'Your recovery link is single-use and expires after one hour.'}>
      {message ? <Message>{message}</Message> : (
        <form onSubmit={submit} className="mt-6 space-y-4 text-left">
          <div><label htmlFor="new-password" className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/80">New password</label><input id="new-password" className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <div><label htmlFor="confirm-new-password" className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/80">Confirm password</label><input id="confirm-new-password" className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>
          {error && <Message error>{error}</Message>}
          <button className={buttonClass} disabled={busy}>{busy ? 'Updating…' : 'Reset password'} <ArrowRight className="h-4 w-4" /></button>
        </form>
      )}
      <Link className="mt-5 inline-block text-sm font-semibold text-cyan-100 hover:text-white" to={message ? '/login' : '/forgot-password'}>{message ? 'Continue to sign in' : 'Request a new link'}</Link>
    </Frame>
  );
}
