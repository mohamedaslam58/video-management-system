import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './users/user.entity';
import { Role } from './common/role.enum';

/**
 * One-off seed script for bootstrapping the first admin account.
 * Run inside the backend container: `node dist/seed.js`
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from env, defaults below for local dev only.
 */
async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User],
    synchronize: false,
  });
  await ds.initialize();

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const repo = ds.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists, skipping.`);
  } else {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await repo.save(
      repo.create({
        email,
        fullName: 'System Administrator',
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      }),
    );
    console.log(`Created admin user ${email}. Change the password after first login.`);
  }

  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
