import { CheckCircle2, CircleAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const success = params.get('status') === 'success';

  return (
    <>
      <div className="mb-8 flex items-center justify-center gap-2.5">
        <img src="/clinova-emblem.png" alt="CLINICKA emblem" width="34" height="34" className="h-9 w-9 object-contain" />
        <img src="/clinicka-wordmark.png" alt="CLINICKA" width="106" height="35" className="h-5 w-auto object-contain" />
      </div>
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${success ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
        {success ? <CheckCircle2 className="h-8 w-8" /> : <CircleAlert className="h-8 w-8" />}
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100/75">Account activation</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{success ? 'Email verified' : 'Link unavailable'}</h1>
      <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-emerald-50/75">
        {success ? 'Your account has been verified successfully.' : 'This activation link is invalid or has expired. Request a new signup link to continue.'}
      </p>
      <Link to="/login" className="brand-button mx-auto mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white">
        {success ? 'Continue to sign in' : 'Return to sign in'} <ArrowRight className="h-4 w-4" />
      </Link>
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/15 bg-black/10 px-3.5 py-3 text-left text-[11px] leading-4 text-emerald-50/75">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200" />
        <span>CLINICKA protects health information through verified accounts and role-based access.</span>
      </div>
      <p className="mt-7 text-center text-[11px] text-emerald-50/50">© 2026 CLINICKA · Private clinic information system</p>
    </>
  );
}
