import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { validateBody, registerSchema, loginSchema } from '../utils/validation';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const signToken = (id: string, email: string) =>
  jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = require('crypto').randomBytes(32).toString('hex');
  const user = await prisma.user.create({ data: { email, passwordHash, name, verifyToken } });
  await sendVerificationEmail(email, verifyToken);
  res.status(201).json({ message: '確認メールを送信しました', userId: user.id });
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified } });
});

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { verifyToken: req.params.token } });
  if (!user) return res.status(404).json({ error: 'Invalid token' });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verifyToken: null } });
  const token = signToken(user.id, user.email);
  res.json({ message: 'メール認証が完了しました', token });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ message: 'メールを送信しました（登録済みの場合）' });
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });
  await sendPasswordResetEmail(email, resetToken);
  res.json({ message: 'パスワードリセットメールを送信しました' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiry: { gt: new Date() } } });
  if (!user) return res.status(400).json({ error: 'トークンが無効か期限切れです' });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiry: null } });
  res.json({ message: 'パスワードをリセットしました' });
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, name: true, emailVerified: true, notifyProgress: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ data: user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PATCH /api/auth/me — プロフィール・通知設定の更新
router.patch('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string };
    const { name, notifyProgress } = req.body;
    const data: { name?: string; notifyProgress?: boolean } = {};
    if (typeof name === 'string') data.name = name.slice(0, 50);
    if (typeof notifyProgress === 'boolean') data.notifyProgress = notifyProgress;
    const user = await prisma.user.update({
      where: { id: payload.id }, data,
      select: { id: true, email: true, name: true, emailVerified: true, notifyProgress: true, createdAt: true },
    });
    res.json({ data: user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
