import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({ role: z.enum(['ADMIN', 'USER']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'Usuario não encontrado' }, { status: 404 });
  }

  if (target.role === 'ADMIN' && parsed.data.role === 'USER') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Não é possível remover o último administrador do sistema' },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });

  await writeAuditLog({
    actorUserId: session.sub,
    action: parsed.data.role === 'ADMIN' ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
    entityType: 'User',
    entityDetails: { targetUserId: id, targetEmail: target.email },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
