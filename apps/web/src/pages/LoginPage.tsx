import { zodResolver } from '@hookform/resolvers/zod';
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
  UserPlus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { getAcademicCatalog } from '../services/api';

const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(224,255,252,0.09)',
    borderRadius: '13px',
    minHeight: 46,
    color: '#f0fdfa',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
    '& input': { padding: '11px 14px', fontSize: 14, fontWeight: 500 },
    '& input::placeholder': { color: 'rgba(207,250,254,0.58)', opacity: 1 },
    '& fieldset': { borderColor: 'rgba(165,243,252,0.34)', borderWidth: 1 },
    '&:hover': { bgcolor: 'rgba(224,255,252,0.13)' },
    '&:hover fieldset': { borderColor: 'rgba(94,234,212,0.72)' },
    '&.Mui-focused': { bgcolor: 'rgba(224,255,252,0.16)', boxShadow: '0 0 0 4px rgba(45,212,191,0.13)' },
    '&.Mui-focused fieldset': { borderColor: '#5eead4', borderWidth: 1.5 },
    '&.Mui-error': { boxShadow: '0 0 0 4px rgba(251,113,133,0.12)' },
    '& .MuiInputAdornment-root': { color: '#a5f3fc' },
    '& .MuiIconButton-root': { color: 'rgba(207,250,254,0.72)' },
    '& input:-webkit-autofill': {
      WebkitTextFillColor: '#f0fdfa',
      WebkitBoxShadow: '0 0 0 100px #155e63 inset',
      caretColor: '#f0fdfa',
    },
  },
  '& .MuiNativeSelect-select': { padding: '11px 42px 11px 14px', fontSize: 14, fontWeight: 500, color: '#f0fdfa' },
  '& .MuiNativeSelect-icon': { color: 'rgba(207,250,254,0.75)' },
  '& option': { color: '#123b43', backgroundColor: '#f0fdfa' },
  '& .MuiFormHelperText-root': { color: '#fecdd3', mx: 0.5, mt: 0.75, fontWeight: 600 },
};

const loginLabelSx = {
  display: 'block',
  mb: 0.8,
  color: 'rgba(236,254,255,0.92)',
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};
  
const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email address.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
  displayName: z.string().optional(),
  patientType: z.enum(['STUDENT', 'FACULTY', 'STAFF']).optional(),
  studentId: z.string().optional(),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
  yearLevel: z.string().optional(),
  section: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const ERROR_MESSAGES = {
  NO_INPUTS: 'Please enter your email and password.',
  EMPTY_EMAIL: 'Please enter your email address.',
  EMPTY_PASSWORD: 'Please enter your password.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_NOT_FOUND: 'No account found with this email address.',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email before logging in.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact the administrator.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
} as const;

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string | string[]; code?: string } | undefined;

    if (!status || !error.response) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    if (status === 400) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }

    if (status === 401) {
      if (data?.code === 'INVALID_CREDENTIALS') {
        return ERROR_MESSAGES.INVALID_CREDENTIALS;
      }
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }

    if (status === 403) {
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        return ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED;
      }
      if (data?.code === 'ACCOUNT_DISABLED') {
        return ERROR_MESSAGES.ACCOUNT_DISABLED;
      }
      return ERROR_MESSAGES.ACCOUNT_DISABLED;
    }

    if (status === 404) {
      if (data?.code === 'USER_NOT_FOUND') {
        return ERROR_MESSAGES.ACCOUNT_NOT_FOUND;
      }
      return ERROR_MESSAGES.ACCOUNT_NOT_FOUND;
    }

    if (status >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }

    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    return message || ERROR_MESSAGES.INVALID_CREDENTIALS;
  }

  return ERROR_MESSAGES.SERVER_ERROR;
}

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
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: import.meta.env.DEV ? 'admin.demo@brokenshire.edu.ph' : '',
      password: '',
    },
  });
  const patientType = watch('patientType') ?? 'STUDENT';
  const departmentId = watch('departmentId') ?? '';
  const catalog = useQuery({ queryKey: ['academic-catalog'], queryFn: getAcademicCatalog, enabled: isSignup });
  const programs = catalog.data?.find((department) => department.id === departmentId)?.programs ?? [];

  async function onSubmit(values: LoginForm) {
    clearErrors('root');
    clearErrors('email');
    clearErrors('password');

    if (!values.email && !values.password) {
      setError('root', { message: ERROR_MESSAGES.NO_INPUTS });
      return;
    }

    if (!values.email) {
      setError('email', { message: ERROR_MESSAGES.EMPTY_EMAIL });
      return;
    }

    if (!values.password) {
      setError('password', { message: ERROR_MESSAGES.EMPTY_PASSWORD });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError('email', { message: ERROR_MESSAGES.INVALID_EMAIL });
      return;
    }

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
        if (!values.departmentId) {
          setError('departmentId', { message: 'Select your department.' });
          return;
        }
        if (values.patientType === 'STUDENT' && (!values.studentId || !values.programId || !values.yearLevel)) {
          setError('root', { message: 'Student ID, department, program, and year level are required.' });
          return;
        }
        const result = await auth.signup(
          values.email,
          values.displayName,
          values.password,
          values.patientType ?? 'STUDENT',
          {
            studentId: values.studentId || undefined,
            departmentId: values.departmentId,
            programId: values.programId || undefined,
            yearLevel: values.yearLevel ? Number(values.yearLevel) : undefined,
            section: values.section || undefined,
          },
        );
        setSuccessMessage(result.message);
        setVerificationUrl(result.verificationUrl);
        return;
      } else {
        await auth.login(values.email, values.password);
      }
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = getLoginErrorMessage(error);
      setError('root', { message });
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ position: 'relative', zIndex: 10 }}
    >
      <Typography
        component="h1"
        sx={{
          color: 'white',
          fontSize: { xs: 28, sm: 34 },
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
        }}
      >
        {isSignup ? 'Create your account' : 'Welcome back'}
      </Typography>
      <Typography sx={{ mt: 1, color: 'rgba(236,254,255,0.8)', fontSize: 16 }}>
        {isSignup
          ? 'Use your Brokenshire institutional email.'
          : 'Sign in to access your CLINICKA workspace.'}
      </Typography>
      {errors.root?.message && (
        <Alert
          severity="error"
          sx={{
            mt: 2.5,
            bgcolor: 'rgba(76,5,25,0.7)',
            color: '#ffe4e6',
            '& .MuiAlert-icon': { color: '#fda4af' },
          }}
        >
          {errors.root.message}
        </Alert>
      )}
      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mt: 2.5,
            bgcolor: 'rgba(2,44,34,0.7)',
            color: '#d1fae5',
            '& .MuiAlert-icon': { color: '#6ee7b7' },
          }}
        >
          {successMessage}
          {verificationUrl && (
            <a
              href={verificationUrl}
              className="mt-2 inline-block font-semibold underline hover:text-white"
            >
              Activate my account
            </a>
          )}
        </Alert>
      )}
      {isSignup && (
        <Box sx={{ display: 'grid', gap: 2.25, mt: 3 }}>
          <Box>
            <Typography component="label" htmlFor="display-name" sx={loginLabelSx}>
              Full name
            </Typography>
            <TextField
              id="display-name"
              fullWidth
              autoComplete="name"
              placeholder="e.g. Juan Dela Cruz"
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              {...register('displayName')}
              sx={loginFieldSx}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><UserRound size={18} /></InputAdornment> } }}
            />
          </Box>
          <Box>
            <Typography component="label" htmlFor="patient-type" sx={loginLabelSx}>
              Campus affiliation
            </Typography>
            <TextField
              id="patient-type"
              select
              fullWidth
              defaultValue="STUDENT"
              {...register('patientType')}
              sx={loginFieldSx}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><BadgeCheck size={18} /></InputAdornment> }, select: { native: true } }}
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="STAFF">Staff</option>
            </TextField>
          </Box>
          <Box>
            <Typography component="label" htmlFor="department" sx={loginLabelSx}>Department</Typography>
            <TextField id="department" select fullWidth defaultValue="" error={Boolean(errors.departmentId)} helperText={errors.departmentId?.message} {...register('departmentId')} sx={loginFieldSx} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Building2 size={18} /></InputAdornment> }, select: { native: true } }}>
              <option value="">Select department</option>
              {catalog.data?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </TextField>
          </Box>
          {patientType === 'STUDENT' && <>
            <Box><Typography component="label" htmlFor="student-id" sx={loginLabelSx}>Student ID</Typography><TextField id="student-id" fullWidth placeholder="e.g. 2026-0001" {...register('studentId')} sx={loginFieldSx} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Hash size={18} /></InputAdornment> } }} /></Box>
            <Box><Typography component="label" htmlFor="program" sx={loginLabelSx}>Program</Typography><TextField id="program" select fullWidth defaultValue="" {...register('programId')} sx={loginFieldSx} slotProps={{ input: { startAdornment: <InputAdornment position="start"><GraduationCap size={18} /></InputAdornment> }, select: { native: true } }}><option value="">Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</TextField></Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 2 }}><Box><Typography component="label" htmlFor="year-level" sx={loginLabelSx}>Year level</Typography><TextField id="year-level" select fullWidth defaultValue="" {...register('yearLevel')} sx={loginFieldSx} slotProps={{ select: { native: true } }}><option value="">Select year</option>{[1,2,3,4,5,6].map((year) => <option key={year} value={year}>Year {year}</option>)}</TextField></Box><Box><Typography component="label" htmlFor="section" sx={loginLabelSx}>Section</Typography><TextField id="section" fullWidth placeholder="Optional" {...register('section')} sx={loginFieldSx} /></Box></Box>
          </>}
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 2.25, mt: 3 }}>
        <Box>
          <Typography component="label" htmlFor="login-email" sx={loginLabelSx}>
            Email
          </Typography>
          <TextField
            id="login-email"
            fullWidth
            autoComplete="email"
            placeholder="name@brokenshire.edu.ph"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
            sx={loginFieldSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={20} color="#0a4650" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <Box>
          <Typography component="label" htmlFor="password" sx={loginLabelSx}>
            Password
          </Typography>
          <TextField
            id="password"
            fullWidth
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            type={showPassword ? 'text' : 'password'}
            placeholder={isSignup ? 'Create a secure password' : 'Enter your password'}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
            sx={loginFieldSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockKeyhole size={20} color="#0a4650" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Box>
      {isSignup && (
        <Box sx={{ mt: 2.5 }}>
          <Typography component="label" htmlFor="confirm-password" sx={loginLabelSx}>
            Confirm password
          </Typography>
          <TextField
            id="confirm-password"
            fullWidth
            autoComplete="new-password"
            type="password"
            placeholder="Enter the password again"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            sx={loginFieldSx}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockKeyhole size={18} /></InputAdornment> } }}
          />
        </Box>
      )}

      {!isSignup && (
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <FormControlLabel
            sx={{
              color: 'rgba(236,254,255,0.85)',
              '& .MuiFormControlLabel-label': { fontSize: 13 },
            }}
            control={
              <Checkbox
                size="small"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                sx={{ color: '#a5f3fc', '&.Mui-checked': { color: '#2dd4bf' } }}
              />
            }
            label="Remember me"
          />
          <Link className="font-semibold text-sm text-cyan-200 hover:text-white" to="/forgot-password">
            Forgot password?
          </Link>
        </Box>
      )}

      {!isSignup && (
        <div className="mt-2 text-right">
          <Link className="text-xs font-semibold text-cyan-100/80 hover:text-white" to="/resend-verification">Resend verification email</Link>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        fullWidth
        variant="contained"
        endIcon={isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
        sx={{
          mt: 3,
          height: 46,
          borderRadius: '13px',
          fontWeight: 800,
          fontSize: 14,
          background: 'linear-gradient(90deg, #0d9488, #10b981)',
          boxShadow: '0 10px 24px rgba(16,185,129,0.22)',
          '&:hover': { background: 'linear-gradient(90deg, #0f766e, #059669)', boxShadow: '0 12px 28px rgba(16,185,129,0.3)' },
        }}
      >
        {isSubmitting
          ? isSignup
            ? 'Creating account...'
            : 'Signing in...'
          : isSignup
            ? 'Create account'
            : 'Sign in'}
      </Button>

      <div className="my-5 flex items-center gap-4 text-[12px] uppercase tracking-wider text-cyan-50/55">
        <span className="h-px flex-1 bg-white/20" />
        <span>or</span>
        <span className="h-px flex-1 bg-white/20" />
      </div>
      <div className="flex items-center justify-center gap-2 text-[14px] text-cyan-50/80">
        <span>{isSignup ? 'Already registered?' : 'New to CLINICKA?'}</span>
        <Button
          type="button"
          onClick={() => {
            const nextSignup = !isSignup;
            setIsSignup(nextSignup);
            setSuccessMessage('');
            setVerificationUrl(undefined);
            setError('root', { message: '' });
            reset(
              nextSignup
                ? { email: '', displayName: '', password: '', confirmPassword: '' }
                : {
                    email: import.meta.env.DEV ? 'admin.demo@brokenshire.edu.ph' : '',
                    password: '',
                    displayName: '',
                    confirmPassword: '',
                  },
            );
          }}
          variant="text"
          size="small"
          sx={{
            color: '#a5f3fc',
            fontWeight: 700,
            p: 0,
            minWidth: 0,
            '&:hover': { color: 'white', bgcolor: 'transparent' },
          }}
        >
          {isSignup ? 'Sign in' : 'Create an account'}
        </Button>
      </div>

      {import.meta.env.DEV && (
        <details className="group mt-5 rounded-xl border border-white/20 bg-black/10 text-[12px] text-cyan-50/75">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> View demo
            credentials (Development only)
          </summary>
          <div className="border-t border-white/15 px-4 py-3 leading-5">
            <p>admin / nurse / faculty / staff / student</p>
            <p>@brokenshire.edu.ph</p>
            {/* The password is deliberately not shown here. The seed prints it
                once, or reads it from SEED_DEMO_PASSWORD. */}
            <p>Password: the value printed by the seed (or your SEED_DEMO_PASSWORD).</p>
          </div>
        </details>
      )}

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-4 text-cyan-50/80">
        <ShieldCheck className="h-8 w-8 shrink-0 text-cyan-200" />
        <span>
          <strong className="block text-[14px] text-white">Secure campus health system</strong>
          <small className="text-[12px]">Protected by role-based access controls.</small>
        </span>
      </div>
      <p className="mt-7 text-center text-[12px] text-cyan-50/55">
        © 2026 CLINICKA · Brokenshire College
      </p>
    </Box>
  );
}
