import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateVerificationCode, hashVerificationCode, isProtuneEmail } from '@/lib/auth';
import { sendVerificationCodeEmail } from '@/lib/email';
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

  if (!isProtuneEmail(email)) {
    return NextResponse.json(
      { error: 'O cadastro e restrito a e-mails do dominio @protune.com.br' },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user && user.status === 'ACTIVE') {
    return NextResponse.json(
      { error: 'Este e-mail ja possui uma conta ativa. Faca login.' },
      { status: 409 }
    );
  }

  if (user && user.status === 'DISABLED') {
    return NextResponse.json({ error: 'Esta conta esta desativada.' }, { status: 403 });
  }

  if (!user) {
    user = await prisma.user.create({
      data: { email, status: 'PENDING_VERIFICATION', role: 'USER' },
    });
  }

  const lastCode = await prisma.verificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (lastCode && Date.now() - lastCode.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return NextResponse.json(
      { error: 'Aguarde um pouco antes de solicitar um novo codigo.' },
      { status: 429 }
    );
  }

  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);
  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendVerificationCodeEmail(email, code);

  await writeAuditLog({
    actorUserId: user.id,
    action: 'USER_SIGNUP',
    entityType: 'User',
    entityDetails: { email },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
