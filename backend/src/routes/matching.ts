import { Router, Request, Response } from 'express';
import { runMatching } from '../services/matching';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { prefecture, industry, employees } = req.body;
  if (!prefecture || !industry || !employees) return res.status(400).json({ error: 'prefecture, industry, employees required' });
  const data = await runMatching({ prefecture, industry, employees });
  res.json({ data });
});

export default router;
