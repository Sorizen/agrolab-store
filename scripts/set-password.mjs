import { getPool } from '../lib/db.js';
import { setUserPassword } from '../lib/users.js';

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run set-password -- <email> <new password, 8+ characters>');
  process.exit(1);
}
try {
  const user = await setUserPassword(email, password);
  console.log(user ? `Password updated for ${user.email}` : `No account with email ${email}`);
  if (!user) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await getPool()?.end();
}
