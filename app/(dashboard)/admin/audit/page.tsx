import Link from 'next/link';
import type { AuditAction } from '@prisma/client';
import { requireAdminPage } from '@/lib/auth';
import { prisma } from '@/lib/db';

const ACTIONS: AuditAction[] = [
  'USER_SIGNUP',
  'EMAIL_VERIFIED',
  'PASSWORD_SET',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ADMIN_GRANTED',
  'ADMIN_REVOKED',
  'MODEL_CREATED',
  'MODEL_UPDATED',
  'MODEL_DELETED',
  'FEATURE_CREATED',
  'FEATURE_UPDATED',
  'FEATURE_DEACTIVATED',
  'CODE_GENERATED',
];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const actionFilter =
    params.action && (ACTIONS as string[]).includes(params.action)
      ? (params.action as AuditAction)
      : undefined;

  const logs = await prisma.auditLog.findMany({
    where: actionFilter ? { action: actionFilter } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: { select: { email: true } } },
  });

  return (
    <div className="section">
      <h2>Auditoria</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <Link href="/admin/audit" className={!actionFilter ? 'active' : ''}>
          Todas
        </Link>
        {ACTIONS.map((a) => (
          <Link key={a} href={`/admin/audit?action=${a}`} className={actionFilter === a ? 'active' : ''}>
            {a}
          </Link>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Ação</th>
            <th>Usuário</th>
            <th>Detalhes</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.createdAt.toLocaleString('pt-BR')}</td>
              <td>{log.action}</td>
              <td>{log.actor?.email ?? '-'}</td>
              <td style={{ maxWidth: 360, wordBreak: 'break-word' }}>
                {log.entityDetails ? JSON.stringify(log.entityDetails) : '-'}
              </td>
              <td>{log.ipAddress ?? '-'}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum registro encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
