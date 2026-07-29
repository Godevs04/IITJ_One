import 'dotenv/config';
import { connectDb, disconnectDb } from '../../src/db';
import { findAdminByEmail } from '../../src/store';
import { signAccessToken } from '../../src/middleware/auth';

const roleArg = process.argv.find((a) => a.startsWith('--role='));
const roleOverride = roleArg ? roleArg.split('=')[1] : undefined;

async function main() {
  await connectDb();
  const admin = await findAdminByEmail('admin@iitjone.in');
  if (!admin) throw new Error('no admin');
  const token = signAccessToken({
    sub: admin.email,
    email: admin.email,
    name: admin.name,
    role: (roleOverride ?? admin.role) as 'admin' | 'superadmin',
    tokenVersion: admin.tokenVersion,
  });
  console.log(token);
  await disconnectDb();
}
main();
