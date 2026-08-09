import { requireAdminPage } from '@/lib/auth';
import { prisma } from '@/lib/db';
import UsersTable from './users-table';

export default async function AdminUsersPage() {
  const currentUser = await requireAdminPage();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true, status: true, createdAt: true },
  });

  return (
    <div className="section">
      <h2>Usuários</h2>
      <UsersTable
        users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
