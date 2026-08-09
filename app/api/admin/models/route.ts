import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const createSchema = z.object({
  productCode: z.string().length(11, 'Codigo de produto deve ter exatamente 11 caracteres'),
  name: z.string().min(1, 'Nome e obrigatorio'),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const models = await prisma.productModel.findMany({ orderBy: { productCode: 'asc' } });
  return NextResponse.json({ models });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
      { status: 400 }
    );
  }

  const existing = await prisma.productModel.findUnique({
    where: { productCode: parsed.data.productCode },
  });
  if (existing) {
    return NextResponse.json({ error: 'Ja existe um modelo com esse codigo de produto' }, { status: 409 });
  }

  const model = await prisma.productModel.create({
    data: { productCode: parsed.data.productCode, name: parsed.data.name, createdBy: session.sub },
  });

  await writeAuditLog({
    actorUserId: session.sub,
    action: 'MODEL_CREATED',
    entityType: 'ProductModel',
    entityDetails: { productCode: model.productCode, name: model.name },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true, model });
}
