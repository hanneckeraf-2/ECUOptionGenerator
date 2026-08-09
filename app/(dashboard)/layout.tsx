import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import NavBar from './nav-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <NavBar email={user.email} role={user.role} />
      <div className="container">{children}</div>
    </div>
  );
}
