import { Router, Request, Response } from 'express';
import { runMatching } from '../services/matching';
import { generateMatchingPdf } from '../services/pdf';
import { validateBody, matchingSchema } from '../utils/validation';

const router = Router();

router.post('/', validateBody(matchingSchema), async (req: Request, res: Response) => {
  const { prefecture, industry, employees } = req.body;
  const data = await runMatching({ prefecture, industry, employees });
  res.json({ data });
});

router.post('/pdf', validateBody(matchingSchema), async (req: Request, res: Response) => {
  const { prefecture, industry, employees } = req.body;
  const results = await runMatching({ prefecture, industry, employees });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="matching_result.pdf"');
  generateMatchingPdf({ prefecture, industry, employees }, results as any).pipe(res);
});

export default router;
