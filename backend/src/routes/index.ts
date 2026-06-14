import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import subsidiesRouter from './subsidies';
import alertsRouter from './alerts';
import consultingRouter from './consulting';
import matchingRouter from './matching';
import templatesRouter from './templates';
import adminRouter from './admin';
import municipalitiesRouter from './municipalities';
import authRouter from './auth';
import favoritesRouter from './favorites';
import progressRouter from './progress';
import eventsRouter from './events';
import docsRouter from './docs';
import collectionsRouter from './collections';

export const router = Router();

// Liveness: プロセスが生きているか（依存チェックなし・常に200）
router.get('/health', (_, res) => res.json({ status: 'ok' }));

// Readiness: DB疎通を含む。失敗時は503を返す
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'up' });
  } catch (e: any) {
    res.status(503).json({ status: 'not_ready', db: 'down', error: e?.message });
  }
});

router.use('/', docsRouter);
router.use('/subsidies', subsidiesRouter);
router.use('/alerts', alertsRouter);
router.use('/consulting', consultingRouter);
router.use('/matching', matchingRouter);
router.use('/templates', templatesRouter);
router.use('/admin', adminRouter);
router.use('/municipalities', municipalitiesRouter);
router.use('/auth', authRouter);
router.use('/favorites', favoritesRouter);
router.use('/progress', progressRouter);
router.use('/events', eventsRouter);
router.use('/collections', collectionsRouter);
