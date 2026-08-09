import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, VERIFY_TOKEN_COOKIE_NAME, verifyVerifyToken } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const bodySchema = z.object({
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Senha invalida' },
      { status: 400 }
    );
  }

  const store = await cookies();
  const token = store.get(VERIFY_TOKEN_COOKIE_NAME)?.value;
  const userId = token ? verifyVerifyToken(token) : null;
  if (!userId) {
    return NextResponse.json(
      { error: 'Sessao de verificacao expirada. Reinicie o cadastro.' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== 'PENDING_VERIFICATION') {
    return NextResponse.json({ error: 'Conta invalida para esta operacao' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, status: 'ACTIVE' },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'PASSWORD_SET',
    entityType: 'User',
    entityDetails: { email: user.email },
    ipAddress: getClientIp(request),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(VERIFY_TOKEN_COOKIE_NAME);
  return response;
}
