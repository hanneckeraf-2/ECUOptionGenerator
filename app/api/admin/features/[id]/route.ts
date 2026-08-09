import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  const before = await prisma.feature.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: 'Feature nao encontrada' }, { status: 404 });
  }

  const feature = await prisma.feature.update({ where: { id }, data: parsed.data });

  // "Remover" uma feature = desativar (isActive=false). O featureNumber nunca
  // e reaproveitado nem alterado, pois e o FNumber usado no algoritmo de
  // geracao de codigo - reusar o numero invalidaria/colidiria com codigos ja
  // gerados para ECUs em campo.
  const deactivated = parsed.data.isActive === false && before.isActive;
  await writeAuditLog({
    actorUserId: session.sub,
    action: deactivated ? 'FEATURE_DEACTIVATED' : 'FEATURE_UPDATED',
    entityType: 'Feature',
    entityDetails: { featureNumber: feature.featureNumber, changes: parsed.data },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
