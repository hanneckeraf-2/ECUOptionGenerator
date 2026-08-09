'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

function statusBadgeClass(status: UserRow['status']): string {
  if (status === 'ACTIVE') return 'active';
  if (status === 'PENDING_VERIFICATION') return 'pending';
  return 'disabled';
}

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleRole(user: UserRow) {
    setError(null);
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const message =
      nextRole === 'ADMIN'
        ? `Tornar ${user.email} administrador?`
        : `Remover ${user.email} do perfil administrador?`;
    if (!window.confirm(message)) return;

    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Nao foi possivel atualizar o usuario');
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Criado em</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <span className={`badge ${u.role === 'ADMIN' ? 'admin' : ''}`}>
                  {u.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                </span>
              </td>
              <td>
                <span className={`badge ${statusBadgeClass(u.status)}`}>{u.status}</span>
              </td>
              <td>{new Date(u.createdAt).toLocaleString('pt-BR')}</td>
              <td>
                {u.id !== currentUserId && (
                  <button
                    className={u.role === 'ADMIN' ? 'danger' : 'secondary'}
                    disabled={pendingId === u.id}
                    onClick={() => toggleRole(u)}
                  >
                    {u.role === 'ADMIN' ? 'Remover admin' : 'Tornar admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
