import { query } from './db.js';
import { hashPassword, verifyPassword } from './password.js';

const PROFILE_FIELDS = ['first_name', 'last_name', 'patronymic', 'phone', 'city', 'branch', 'delivery_method'];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function findUserByEmail(email) {
  const { rows } = await query('select * from users where lower(email) = $1', [normalizeEmail(email)]);
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await query('select * from users where id = $1', [id]);
  return rows[0] || null;
}

export async function createUser({ email, password, role = 'customer', ...profile }) {
  const passwordHash = await hashPassword(password);
  const values = PROFILE_FIELDS.map((f) => String(profile[f] ?? '').trim());
  const { rows } = await query(
    `insert into users (email, password_hash, role, ${PROFILE_FIELDS.join(', ')})
     values ($1, $2, $3, ${PROFILE_FIELDS.map((_, i) => `$${i + 4}`).join(', ')})
     returning *`,
    [normalizeEmail(email), passwordHash, role, ...values]
  );
  return rows[0];
}

export async function authenticate(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;
  await query('update users set last_login_at = now() where id = $1', [user.id]);
  return user;
}

export async function updateUserProfile(id, profile) {
  const sets = [];
  const params = [];
  for (const field of PROFILE_FIELDS) {
    if (profile[field] !== undefined) {
      params.push(String(profile[field] ?? '').trim());
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getUserById(id);
  params.push(id);
  const { rows } = await query(
    `update users set ${sets.join(', ')}, updated_at = now() where id = $${params.length} returning *`,
    params
  );
  return rows[0] || null;
}

export async function setUserRole(email, role) {
  const { rows } = await query(
    'update users set role = $2, updated_at = now() where lower(email) = $1 returning id, email, role',
    [normalizeEmail(email), role]
  );
  return rows[0] || null;
}

export async function setUserPassword(email, password) {
  const { rows } = await query(
    'update users set password_hash = $2, updated_at = now() where lower(email) = $1 returning id, email, role',
    [normalizeEmail(email), await hashPassword(password)]
  );
  return rows[0] || null;
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    metadata: Object.fromEntries(PROFILE_FIELDS.map((f) => [f, user[f] || ''])),
  };
}
