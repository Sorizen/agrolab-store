import { getPool } from '../lib/db.js';
import { findUserByEmail, createUser, setUserRole, setUserPassword } from '../lib/users.js';

const [email, password] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run create-admin -- <email> [password]');
  process.exit(1);
}

try {
  const existing = await findUserByEmail(email);
  if (existing) {
    await setUserRole(email, 'admin');
    if (password) await setUserPassword(email, password);
    console.log(`${email} is now an admin${password ? ' (password updated)' : ''}.`);
  } else {
    if (!password || password.length < 8) {
      throw new Error('New account: give a password of at least 8 characters.');
    }
    await createUser({ email, password, role: 'admin' });
    console.log(`Admin account created: ${email}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await getPool()?.end();
}
