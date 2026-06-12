import { Router } from 'express';
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

export const router = Router();

router.get('/health', (_, res) => res.json({ status: 'ok' }));
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
