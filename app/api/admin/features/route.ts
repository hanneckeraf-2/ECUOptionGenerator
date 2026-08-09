import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const createSchema = z.object({ name: z.string().min(1, 'Nome e obrigatorio') });

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const features = await prisma.feature.findMany({ orderBy: { featureNumber: 'asc' } });
  return NextResponse.json({ features });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  // featureNumber e atribuido sequencialmente e nunca reaproveitado, pois e o
  // valor usado no algoritmo de geracao de codigo (FNumber) - ver lib/keeloq.ts.
  const feature = await prisma.$transaction(async (tx) => {
    const last = await tx.feature.findFirst({ orderBy: { featureNumber: 'desc' } });
    const nextNumber = (last?.featureNumber ?? 0) + 1;
    return tx.feature.create({
      data: { name: parsed.data.name, featureNumber: nextNumber, createdBy: session.sub },
    });
  });

  await writeAuditLog({
    actorUserId: session.sub,
    action: 'FEATURE_CREATED',
    entityType: 'Feature',
    entityDetails: { featureNumber: feature.featureNumber, name: feature.name },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true, feature });
}
