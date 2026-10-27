import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, verifyVerificationCode } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }
  const email = parsed.data.email.toLowerCase().trim();
  const { code, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
  }

  const verification = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Número máximo de tentativas excedido. Solicite um novo código.' },
      { status: 429 }
    );
  }

  const valid = await verifyVerificationCode(code, verification.codeHash);
  if (!valid) {
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: 'Código incorreto' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.verificationCode.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
  ]);

  await writeAuditLog({
    actorUserId: user.id,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityDetails: { email },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
