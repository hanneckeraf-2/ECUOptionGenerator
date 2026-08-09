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

  const existing = await prisma.productModel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Modelo nao encontrado' }, { status: 404 });
  }

  const model = await prisma.productModel.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    actorUserId: session.sub,
    action: 'MODEL_UPDATED',
    entityType: 'ProductModel',
    entityDetails: { productCode: model.productCode, changes: parsed.data },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const model = await prisma.productModel.findUnique({ where: { id } });
  if (!model) {
    return NextResponse.json({ error: 'Modelo nao encontrado' }, { status: 404 });
  }

  await prisma.productModel.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.sub,
    action: 'MODEL_DELETED',
    entityType: 'ProductModel',
    entityDetails: { productCode: model.productCode, name: model.name },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
