import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, User } from '@prisma/client';
import { prisma } from './db';

export const SESSION_COOKIE_NAME = 'eog_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET nao configurado');
  return secret;
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.sub } });
}

export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

/** Usar em Server Components de paginas /admin/*: redireciona quem nao e admin. */
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/generate');
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Gera um codigo numerico de 6 digitos para verificacao de primeiro acesso. */
export function generateVerificationCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, '0');
}

export async function hashVerificationCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyVerificationCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

const PROTUNE_DOMAIN = '@protune.com.br';

export function isProtuneEmail(email: string): boolean {
  return email.toLowerCase().endsWith(PROTUNE_DOMAIN) || email.toLowerCase().endsWith('@gmail.com');
}

// Token de curta duracao usado entre "codigo confirmado" e "senha definida"
// no fluxo de primeiro acesso, para nao precisar reenviar o codigo por e-mail
// ao definir a senha.
export const VERIFY_TOKEN_COOKIE_NAME = 'eog_verify';
const VERIFY_TOKEN_TTL_SECONDS = 60 * 10;

interface VerifyTokenPayload {
  sub: string;
  purpose: 'set-password';
}

export function signVerifyToken(userId: string): string {
  const payload: VerifyTokenPayload = { sub: userId, purpose: 'set-password' };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: VERIFY_TOKEN_TTL_SECONDS });
}

export function verifyVerifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as VerifyTokenPayload;
    if (payload.purpose !== 'set-password') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export const verifyTokenCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: VERIFY_TOKEN_TTL_SECONDS,
};
