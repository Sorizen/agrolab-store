import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'store_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function authConfigured() {
  return secretKey() !== null;
}

export async function signSession(user) {
  const key = secretKey();
  if (!key) throw new Error('AUTH_SECRET is missing or shorter than 32 characters. See .env.local.example');
  return new SignJWT({ email: user.email, role: user.role || 'customer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySession(token) {
  const key = secretKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return { id: Number(payload.sub), email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
