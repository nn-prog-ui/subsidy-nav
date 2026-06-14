import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendAlertVerificationEmail } from '../services/email';
import { validateBody, alertSchema } from '../utils/validation';

const router = Router();

router.post('/', validateBody(alertSchema), async (req: Request, res: Response) => {
  const { email, prefectures, categories, keywords, municipalityCodes } = req.body;
  const alert = await prisma.alert.create({
    data: { email, prefectures: prefectures || [], categories: categories || [], keywords: keywords || [], municipalityCodes: municipalityCodes || [] },
  });
  await sendAlertVerificationEmail(email, alert.token);
  res.json({ data: alert, message: '確認メールを送信しました' });
});

router.get('/verify/:token', async (req: Request, res: Response) => {
  const alert = await prisma.alert.findUnique({ where: { token: req.params.token } });
  if (!alert) return res.status(404).json({ error: 'Invalid token' });
  await prisma.alert.update({ where: { id: alert.id }, data: { verified: true } });
  res.json({ message: 'アラートが有効化されました' });
});

// ワンクリック配信停止（メール内リンク用、tokenで認証）
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  const alert = await prisma.alert.findUnique({ where: { token: req.params.token } });
  if (!alert) return res.status(404).json({ error: 'Invalid token' });
  await prisma.alert.update({ where: { id: alert.id }, data: { active: false } });
  res.json({ message: 'メール配信を停止しました', email: alert.email });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.alert.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ message: '解除しました' });
});

export default router;
