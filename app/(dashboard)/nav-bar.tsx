'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@prisma/client';

export default function NavBar({ email, role }: { email: string; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="appnav">
      <Link href="/generate" className={isActive('/generate') ? 'active' : ''}>
        Gerar Código
      </Link>
      {role === 'ADMIN' && (
        <>
          <Link href="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>
            Usuários
          </Link>
          <Link href="/admin/models" className={isActive('/admin/models') ? 'active' : ''}>
            Modelos
          </Link>
          <Link href="/admin/features" className={isActive('/admin/features') ? 'active' : ''}>
            Features
          </Link>
          <Link href="/admin/audit" className={isActive('/admin/audit') ? 'active' : ''}>
            Auditoria
          </Link>
        </>
      )}
      <span className="spacer" />
      <span>{email}</span>
      <button className="secondary" onClick={handleLogout}>
        Sair
      </button>
    </nav>
  );
}
