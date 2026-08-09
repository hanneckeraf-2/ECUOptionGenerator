import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  signVerifyToken,
  verifyTokenCookieOptions,
  VERIFY_TOKEN_COOKIE_NAME,
  verifyVerificationCode,
} from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const { code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'PENDING_VERIFICATION') {
    return NextResponse.json({ error: 'Codigo invalido ou expirado' }, { status: 400 });
  }

  const verification = await prisma.verificationCode.findFirst({
    where: { userId: user.id, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Codigo invalido ou expirado' }, { status: 400 });
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Numero maximo de tentativas excedido. Solicite um novo codigo.' },
      { status: 429 }
    );
  }

  const valid = await verifyVerificationCode(code, verification.codeHash);
  if (!valid) {
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: 'Codigo incorreto' }, { status: 400 });
  }

  await prisma.verificationCode.update({
    where: { id: verification.id },
    data: { consumedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'EMAIL_VERIFIED',
    entityType: 'User',
    entityDetails: { email },
    ipAddress: getClientIp(request),
  });

  const verifyToken = signVerifyToken(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VERIFY_TOKEN_COOKIE_NAME, verifyToken, verifyTokenCookieOptions);
  return response;
}
