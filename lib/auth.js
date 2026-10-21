import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE, signSession, verifySession, sessionCookieOptions } from './session.js';

export async function getSessionUser() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(user) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions());
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function isAdmin(sessionUser) {
  return sessionUser?.role === 'admin';
}

const attempts = new Map();
export function tooManyAttempts(key, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > limit;
}

export function hasBearerSecret(request, secret) {
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
