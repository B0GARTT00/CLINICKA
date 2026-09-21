import { cn } from '../utils/cn';

type AuthLayoutProps = {
  children: React.ReactNode;
  className?: string;
  align?: 'center' | 'right';
  marketing?: React.ReactNode;
  branding?: React.ReactNode;
};

export function AuthLayout({ children, className, align = 'center', marketing, branding }: AuthLayoutProps) {
  const alignment = align === 'right' ? 'lg:justify-end lg:px-[4.5vw]' : '';

  return (
    <main className="login-page relative min-h-screen overflow-hidden bg-brokenshire-900">
      <div className="login-backdrop absolute inset-0" aria-hidden="true" />
      <div className="login-scrim absolute inset-0" aria-hidden="true" />
      <div className={cn('relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-8', alignment)}>
        {branding && (
          <div className="pointer-events-none absolute left-[4vw] top-[4.5vh] hidden lg:flex">
            {branding}
          </div>
        )}
        {marketing && (
          <div className="pointer-events-none absolute bottom-[9vh] left-[4.5vw] hidden max-w-[520px] text-white lg:block">
            {marketing}
          </div>
        )}
        <section className={cn('login-card relative w-full overflow-hidden rounded-[26px] border p-6 shadow-2xl sm:p-10', className)}>
          <span className="login-card-leaf pointer-events-none absolute -right-8 -top-12 h-40 w-40" aria-hidden="true" />
          {children}
        </section>
      </div>
    </main>
  );
}
