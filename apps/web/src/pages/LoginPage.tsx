import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.94)',
    borderRadius: 2,
    height: 40,
    '& input': { padding: '8px 14px', fontSize: 14 },
    '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&:hover fieldset': { borderColor: 'rgba(103,232,249,0.8)' },
    '&.Mui-focused fieldset': { borderColor: '#67e8f9' },
  },
  '& .MuiFormHelperText-root': { color: '#ffe4e6', mx: 0 },
};

const loginLabelSx = {
  display: 'block',
  mb: 0.75,
  color: 'rgba(236,254,255,0.9)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .regex(/^[^@\s]+@brokenshire\.edu\.ph$/i, 'Use your @brokenshire.edu.ph email.'),
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
        const result = await auth.signup(
          values.email,
          values.displayName,
          values.password,
          values.patientType ?? 'STUDENT',
        );
        setSuccessMessage(result.message);
        setVerificationUrl(result.verificationUrl);
        return;
      } else {
        await auth.login(values.email, values.password);
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(' ') : responseMessage;
      setError('root', {
        message:
          message ||
          (isSignup
            ? 'Unable to create the account.'
            : 'Sign in failed. Check your email and password.'),
      });
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
              Activate this development account
            </a>
          )}
        </Alert>
      )}
      {isSignup && (
        <Box sx={{ display: 'grid', gap: 2.5, mt: 3 }}>
          <Box>
            <Typography component="label" htmlFor="display-name" sx={loginLabelSx}>
              Full name
            </Typography>
            <TextField
              id="display-name"
              fullWidth
              autoComplete="name"
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              {...register('displayName')}
              sx={loginFieldSx}
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
              slotProps={{ select: { native: true } }}
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="STAFF">Staff</option>
            </TextField>
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 2.5, mt: 3 }}>
        <Box>
          <Typography component="label" htmlFor="login-email" sx={loginLabelSx}>
            Email
          </Typography>
          <TextField
            id="login-email"
            fullWidth
            autoComplete="email"
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
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            sx={loginFieldSx}
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

      <Button
        type="submit"
        disabled={isSubmitting}
        fullWidth
        variant="contained"
        endIcon={isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
        sx={{
          mt: 3,
          height: 40,
          borderRadius: 2,
          fontWeight: 700,
          fontSize: 14,
          background: 'linear-gradient(90deg, #0d9488, #10b981)',
          '&:hover': { background: 'linear-gradient(90deg, #0f766e, #059669)' },
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
                    email: 'admin.demo@brokenshire.edu.ph',
                    password: 'DemoPass123!',
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
            <p>@brokenshire.edu.ph · password: DemoPass123!</p>
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
