import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { query } from './db.js';
import { sendMail } from './mail.js';
import { mailCode, mailHeading, mailMuted, mailParagraph, renderMail } from './mail-layout.js';
import { site } from './site.js';
import { findUserByEmail, setUserPassword } from './users.js';

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MIN_SECONDS_BETWEEN_CODES = 60;
const MAX_CODES_PER_HOUR = 5;

function hashCode(userId, code) {
  const secret = process.env.AUTH_SECRET || '';
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

function sameHash(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildResetMail(code) {
  const text = `Ваш код для відновлення пароля в ${site.name}: ${code}\n\nКод діє ${CODE_TTL_MINUTES} хвилин. Якщо ви не просили змінити пароль, просто проігноруйте цей лист.`;
  const html = renderMail({
    preheader: `Код: ${code}`,
    bodyHtml: [
      mailHeading('Відновлення пароля'),
      mailParagraph('Введіть цей код на сторінці відновлення, щоб задати новий пароль:'),
      mailCode(code),
      mailMuted(`Код діє ${CODE_TTL_MINUTES} хвилин. Якщо ви не просили змінити пароль, просто проігноруйте цей лист: ваш пароль залишиться без змін.`),
    ].join(''),
  });
  return { subject: `Код відновлення пароля: ${code}`, text, html };
}

export async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);
  if (!user) return;
  const { rows } = await query(
    `select count(*) filter (where created_at > now() - interval '1 hour') as hour,
            count(*) filter (where created_at > now() - make_interval(secs => $2)) as recent
     from password_resets where user_id = $1`,
    [user.id, MIN_SECONDS_BETWEEN_CODES]
  );
  if (rows[0].recent > 0 || rows[0].hour >= MAX_CODES_PER_HOUR) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await query(
    `insert into password_resets (user_id, code_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))`,
    [user.id, hashCode(user.id, code), CODE_TTL_MINUTES]
  );
  await sendMail({ to: user.email, ...buildResetMail(code) });
}

export async function confirmPasswordReset(email, code, newPassword) {
  const user = await findUserByEmail(email);
  if (!user) return false;
  const { rows } = await query(
    `update password_resets set attempts = attempts + 1
     where id = (
       select id from password_resets
       where user_id = $1 and used_at is null and expires_at > now() and attempts < $2
       order by id desc limit 1
     )
     returning id, code_hash`,
    [user.id, MAX_ATTEMPTS]
  );
  const reset = rows[0];
  if (!reset || !sameHash(reset.code_hash, hashCode(user.id, String(code).trim()))) return false;

  await setUserPassword(user.email, newPassword);
  await query('update password_resets set used_at = now() where user_id = $1 and used_at is null', [user.id]);
  return true;
}
