import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendConsultingConfirmation, sendConsultingAdminNotification } from '../services/email';
import { validateBody, consultingSchema } from '../utils/validation';

const router = Router();

router.post('/', validateBody(consultingSchema), async (req: Request, res: Response) => {
  const { name, email, company, phone, prefecture, industry, employees, budget, message } = req.body;
  const data = await prisma.consultingRequest.create({ data: { name, email, company, phone, prefecture, industry, employees, budget, message } });
  await sendConsultingConfirmation(name, email);
  await sendConsultingAdminNotification({ name, email, company, phone, prefecture, industry, employees, budget, message });
  res.json({ data, message: 'ご相談を受け付けました' });
});

export default router;
