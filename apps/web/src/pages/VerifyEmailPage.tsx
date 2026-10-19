import { ArrowRight, CheckCircle2, CircleAlert, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EMAIL_VERIFIED_EVENT_KEY } from '../services/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const success = params.get('status') === 'success';
  const session = params.get('session');

  useEffect(() => {
    if (success && session) {
      localStorage.setItem(EMAIL_VERIFIED_EVENT_KEY, session);
    }
  }, [session, success]);

  function closeVerificationTab() {
    window.close();
  }

  return (
    <div className="relative z-10">
      <div className="mb-9 flex items-center justify-center gap-2.5">
        <img src="/clinova-emblem.png" alt="CLINICKA emblem" width="40" height="40" className="h-10 w-10 object-contain" />
        <img src="/clinicka-wordmark.png" alt="CLINICKA" width="122" height="40" className="h-6 w-auto object-contain" />
      </div>

      <div
        className={`mx-auto grid h-20 w-20 place-items-center rounded-[22px] border shadow-lg ${
          success
            ? 'border-emerald-200/30 bg-emerald-300/15 text-emerald-200 shadow-emerald-950/20'
            : 'border-rose-200/30 bg-rose-300/15 text-rose-200 shadow-rose-950/20'
        }`}
        aria-hidden="true"
      >
        {success ? <CheckCircle2 className="h-10 w-10" strokeWidth={1.8} /> : <CircleAlert className="h-10 w-10" strokeWidth={1.8} />}
      </div>

      <div className="mt-7 text-center">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
          success
            ? 'border-emerald-200/20 bg-emerald-300/10 text-emerald-100/80'
            : 'border-rose-200/20 bg-rose-300/10 text-rose-100/80'
        }`}>
          {success ? 'Account activation complete' : 'Activation link issue'}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white">{success ? 'Email verified' : 'Link unavailable'}</h1>
      </div>
      <p className="mx-auto mt-4 max-w-sm text-center text-[14px] leading-6 text-emerald-50/75" aria-live="polite">
        {success ? 'Your account has been verified successfully.' : 'This activation link is invalid or has expired. Request a new signup link to continue.'}
      </p>

      {success && (
        <>
          <p className="mt-2 text-center text-[12px] text-emerald-50/55">
            Your CLINICKA account is ready. Return to the original signup tab to continue.
          </p>
          <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-950/20 px-4 py-3 text-center text-[12px] leading-5 text-cyan-50/75">
            This verification link opened a new browser tab. You can close this tab and return to the CLINICKA signup window.
          </div>
        </>
      )}

      {success ? (
        <button
          type="button"
          onClick={closeVerificationTab}
          className="mx-auto mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-5 text-[13px] font-semibold text-cyan-50 transition-colors hover:bg-white/[0.13]"
        >
          <X className="h-4 w-4" /> Close this tab
        </button>
      ) : (
        <Link
          to="/login"
          className="brand-button mx-auto mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-bold text-white transition-transform"
        >
          Return to sign in <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="mt-7 rounded-2xl border border-white/15 bg-black/10 p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white/90">Your account is protected</p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-50/65">
              CLINICKA uses verified accounts and role-based access to help protect health information.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-emerald-50/50">© 2026 CLINICKA · Brokenshire College</p>
    </div>
  );
}
