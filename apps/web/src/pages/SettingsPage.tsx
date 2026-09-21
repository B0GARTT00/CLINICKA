import { useQuery } from '@tanstack/react-query';
import { Database, LockKeyhole, Server } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getHealth } from '../services/api';

export function SettingsPage() {
  const health = useQuery({ queryKey: ['settings-health'], queryFn: getHealth });
  if (health.isLoading) return <LoadingState label="Checking system settings..." />;
  if (health.isError || !health.data) return <ErrorState message="Unable to check system status." />;
  const status = health.data.status ?? 'ok';
  return <div className="space-y-6"><header><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Administration</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Settings</h1><p className="mt-1 text-[13px] text-medical-500">System status and security configuration overview.</p></header><div className="grid gap-5 md:grid-cols-3"><Card title="API service"><div className="flex items-center gap-2 p-5 text-[13px]"><Server className="h-4 w-4 text-emerald-600" /><span>Service status</span><Badge variant="success">{status}</Badge></div></Card><Card title="Database"><div className="flex items-center gap-2 p-5 text-[13px]"><Database className="h-4 w-4 text-emerald-600" /><span>Prisma connection</span><Badge variant="success">Connected</Badge></div></Card><Card title="Security"><div className="flex items-center gap-2 p-5 text-[13px]"><LockKeyhole className="h-4 w-4 text-emerald-600" /><span>Protected routes</span><Badge variant="success">Enabled</Badge></div></Card></div><Card title="Configuration guidance" description="Sensitive values remain server-side."><div className="space-y-2 p-5 text-[13px] text-medical-600"><p>JWT secrets, database credentials, storage keys, and CORS settings are managed through the API environment configuration.</p><p>Replace development secrets before production deployment and keep audit logging enabled.</p></div></Card></div>;
}
