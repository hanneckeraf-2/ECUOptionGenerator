import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateVerificationCode, hashVerificationCode } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  email: z.string().email(),
});

const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Resposta genérica para não revelar se o e-mail está cadastrado
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ ok: true });
  }

  const lastCode = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose: 'PASSWORD_RESET' },
    orderBy: { createdAt: 'desc' },
  });
  if (lastCode && Date.now() - lastCode.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return NextResponse.json(
      { error: 'Aguarde um pouco antes de solicitar um novo código.' },
      { status: 429 }
    );
  }

  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);
  await prisma.$transaction([
    prisma.verificationCode.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.verificationCode.create({
      data: {
        userId: user.id,
        codeHash,
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  await sendPasswordResetEmail(email, code);

  await writeAuditLog({
    actorUserId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'User',
    entityDetails: { email },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
