import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email().regex(/^[^@\s]+@brokenshire\.edu\.ph$/i, 'Use your @brokenshire.edu.ph email.'),
  displayName: z.string().optional(),
  patientType: z.enum(['STUDENT', 'FACULTY', 'STAFF']).optional(),
  password: z.string().min(8),
  confirmPassword: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin.demo@brokenshire.edu.ph', password: 'DemoPass123!' },
  });

  async function onSubmit(values: LoginForm) {
    try {
      if (isSignup) {
        if (!values.displayName || values.displayName.trim().length < 2) {
          setError('displayName', { message: 'Enter your full name.' });
          return;
        }
        if (values.password !== values.confirmPassword) {
          setError('confirmPassword', { message: 'Passwords do not match.' });
          return;
        }
        const result = await auth.signup(values.email, values.displayName, values.password, values.patientType ?? 'STUDENT');
        setSuccessMessage(result.message);
        setVerificationUrl(result.verificationUrl);
        return;
      } else {
        await auth.login(values.email, values.password);
      }
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(' ') : responseMessage;
      setError('root', { message: message || (isSignup ? 'Unable to create the account.' : 'Sign in failed. Check your email and password.') });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative z-10">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-white">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-[16px] text-cyan-50/80">{isSignup ? 'Use your Brokenshire institutional email.' : 'Sign in to access your CLINICKA workspace.'}</p>
      {errors.root && <p className="mb-5 mt-5 rounded-xl border border-rose-200/40 bg-rose-950/40 px-4 py-3 text-[13px] text-rose-100">{errors.root.message}</p>}
      {successMessage && (
        <div className="mb-5 mt-5 break-words rounded-xl border border-emerald-200/40 bg-emerald-950/40 px-4 py-3 text-[13px] text-emerald-100">
          <p>{successMessage}</p>
          {verificationUrl && <a href={verificationUrl} className="mt-2 inline-block font-semibold underline hover:text-white">Activate this development account</a>}
        </div>
      )}
      {isSignup && (
        <>
        <label className="mt-6 block">
          <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-cyan-50/90">Full name</span>
          <input autoComplete="name" className="login-input h-[52px] w-full rounded-xl px-4 text-[15px] outline-none transition focus:ring-2 focus:ring-cyan-300" {...register('displayName')} />
          {errors.displayName && <span className="text-[12px] text-rose-100">{errors.displayName.message}</span>}
        </label>
        <label className="mt-5 block">
          <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-cyan-50/90">Campus affiliation</span>
          <select defaultValue="STUDENT" className="login-input h-[52px] w-full rounded-xl px-4 text-[15px] outline-none focus:ring-2 focus:ring-cyan-300" {...register('patientType')}>
            <option value="STUDENT">Student</option><option value="FACULTY">Faculty</option><option value="STAFF">Staff</option>
          </select>
        </label>
        </>
      )}
      <label className="mt-6 block">
        <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-cyan-50/90">Email</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0a4650]" />
          <input autoComplete="email" className="login-input h-[52px] w-full rounded-xl pl-12 pr-4 text-[15px] outline-none transition focus:ring-2 focus:ring-cyan-300" {...register('email')} />
        </span>
        {errors.email && <span className="text-[12px] text-rose-100">{errors.email.message}</span>}
      </label>
      <label htmlFor="password" className="mt-5 block">
        <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-cyan-50/90">Password</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0a4650]" />
          <input id="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} className="login-input h-[52px] w-full rounded-xl pl-12 pr-12 text-[15px] outline-none transition focus:ring-2 focus:ring-cyan-300" {...register('password')} />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#0a4650] hover:bg-teal-50" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
        {errors.password && <span className="text-[12px] text-rose-100">{errors.password.message}</span>}
      </label>
      {isSignup && (
        <label htmlFor="confirm-password" className="mt-5 block">
          <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-cyan-50/90">Confirm password</span>
          <input id="confirm-password" autoComplete="new-password" type="password" className="login-input h-[52px] w-full rounded-xl px-4 text-[15px] outline-none transition focus:ring-2 focus:ring-cyan-300" {...register('confirmPassword')} />
          {errors.confirmPassword && <span className="text-[12px] text-rose-100">{errors.confirmPassword.message}</span>}
        </label>
      )}

      {!isSignup && (
        <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
          <label className="flex cursor-pointer items-center gap-2.5 text-cyan-50/85">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-5 w-5 rounded accent-teal-400" />
            Remember me
          </label>
          <Link className="font-semibold text-cyan-200 hover:text-white" to="/forgot-password">Forgot password?</Link>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="brand-button mt-6 inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-xl px-4 text-[15px] font-bold text-white transition disabled:opacity-60">
        <span>{isSubmitting ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}</span>
        {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
      </button>

      <div className="my-5 flex items-center gap-4 text-[12px] uppercase tracking-wider text-cyan-50/55">
        <span className="h-px flex-1 bg-white/20" /><span>or</span><span className="h-px flex-1 bg-white/20" />
      </div>
      <div className="flex justify-center gap-2 text-[14px] text-cyan-50/80">
        <span>{isSignup ? 'Already registered?' : 'New to CLINICKA?'}</span>
        <button
          type="button"
          onClick={() => {
            const nextSignup = !isSignup;
            setIsSignup(nextSignup);
            setSuccessMessage('');
            setVerificationUrl(undefined);
            setError('root', { message: '' });
            reset(nextSignup ? { email: '', displayName: '', password: '', confirmPassword: '' } : { email: 'admin.demo@brokenshire.edu.ph', password: 'DemoPass123!', displayName: '', confirmPassword: '' });
          }}
          className="font-bold text-cyan-200 hover:text-white"
        >
          {isSignup ? 'Sign in' : 'Create an account'}
        </button>
      </div>

      {import.meta.env.DEV && (
        <details className="group mt-5 rounded-xl border border-white/20 bg-black/10 text-[12px] text-cyan-50/75">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3"><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> View demo credentials (Development only)</summary>
          <div className="border-t border-white/15 px-4 py-3 leading-5">
            <p>admin / nurse / faculty / staff / student</p>
            <p>@brokenshire.edu.ph · password: DemoPass123!</p>
          </div>
        </details>
      )}

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-4 text-cyan-50/80">
        <ShieldCheck className="h-8 w-8 shrink-0 text-cyan-200" />
        <span><strong className="block text-[14px] text-white">Secure campus health system</strong><small className="text-[12px]">Protected by role-based access controls.</small></span>
      </div>
      <p className="mt-7 text-center text-[12px] text-cyan-50/55">© 2026 CLINICKA · Brokenshire College</p>
    </form>
  );
}
