import { Router, Request, Response } from 'express';
import { runMatching } from '../services/matching';
import { generateMatchingPdf } from '../services/pdf';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { prefecture, industry, employees } = req.body;
  if (!prefecture || !industry || !employees) return res.status(400).json({ error: 'prefecture, industry, employees required' });
  const data = await runMatching({ prefecture, industry, employees });
  res.json({ data });
});

router.post('/pdf', async (req: Request, res: Response) => {
  const { prefecture, industry, employees } = req.body;
  if (!prefecture || !industry || !employees) return res.status(400).json({ error: 'prefecture, industry, employees required' });
  const results = await runMatching({ prefecture, industry, employees });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="matching_result.pdf"');
  generateMatchingPdf({ prefecture, industry, employees }, results as any).pipe(res);
});

export default router;
