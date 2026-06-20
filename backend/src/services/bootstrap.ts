import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

// 初回デプロイ時、ADMIN_EMAIL/ADMIN_PASSWORD から管理者を1人だけ用意する（冪等）。
// シード未実行の本番でも /admin にログインできるようにするための保険。
// 既存管理者のパスワードは変更しない（update: {}）。両環境変数が無ければ何もしない。
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.adminUser.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: hash },
    });
    console.log(`[bootstrap] admin user ensured: ${email}`);
  } catch (e: any) {
    console.error('[bootstrap] ensureAdminUser failed:', e?.message || e);
  }
}
