import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from './db';

export async function writeAuditLog(params: {
  actorUserId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityDetails?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityDetails: params.entityDetails,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip');
}
