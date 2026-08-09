import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateAuthCode } from '@/lib/keeloq';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  productModelId: z.string().min(1),
  serial: z.string().length(15),
  featureId: z.union([z.literal('ALL'), z.string().min(1)]),
});

function getKeeLoqKey(): { keyHi: number; keyLo: number } {
  const hi = process.env.KEELOQ_KEY_HI;
  const lo = process.env.KEELOQ_KEY_LO;
  if (!hi || !lo) throw new Error('Chave KeeLoq não configurada');
  return { keyHi: Number(hi), keyLo: Number(lo) };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { productModelId, featureId } = parsed.data;
  const serial = parsed.data.serial.trim();
  if (serial.length !== 15) {
    return NextResponse.json({ error: 'Serial deve ter exatamente 15 caracteres' }, { status: 400 });
  }

  const model = await prisma.productModel.findUnique({ where: { id: productModelId } });
  if (!model || !model.isActive) {
    return NextResponse.json({ error: 'Modelo inválido' }, { status: 400 });
  }
  if (model.productCode.length !== 11) {
    return NextResponse.json(
      { error: 'Código de produto do modelo está com tamanho inválido (esperado 11 caracteres)' },
      { status: 500 }
    );
  }

  const features =
    featureId === 'ALL'
      ? await prisma.feature.findMany({ where: { isActive: true }, orderBy: { featureNumber: 'asc' } })
      : await prisma.feature
          .findUnique({ where: { id: featureId } })
          .then((f) => (f && f.isActive ? [f] : []));

  if (features.length === 0) {
    return NextResponse.json({ error: 'Nenhuma opção válida selecionada' }, { status: 400 });
  }

  const { keyHi, keyLo } = getKeeLoqKey();
  const ipAddress = getClientIp(request);
  const results: Array<{ featureNumber: number; featureName: string; code: string }> = [];

  for (const feature of features) {
    const code = generateAuthCode({
      model11: model.productCode,
      serial15: serial,
      featureNumber: feature.featureNumber,
      keyHi,
      keyLo,
    });
    results.push({ featureNumber: feature.featureNumber, featureName: feature.name, code });

    await writeAuditLog({
      actorUserId: session.sub,
      action: 'CODE_GENERATED',
      entityType: 'GeneratedCode',
      entityDetails: {
        productCode: model.productCode,
        modelName: model.name,
        serial,
        featureNumber: feature.featureNumber,
        featureName: feature.name,
        code,
      },
      ipAddress,
    });
  }

  return NextResponse.json({ results });
}
