import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  sessionCookieOptions,
  signSession,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const ipAddress = getClientIp(request);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
    await writeAuditLog({
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityDetails: { email },
      ipAddress,
    });
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.' },
      { status: 423 }
    );
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    await writeAuditLog({
      actorUserId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityDetails: { email },
      ipAddress,
    });
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  const token = signSession({ sub: user.id, email: user.email, role: user.role });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityDetails: { email },
    ipAddress,
  });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
