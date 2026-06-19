import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { startScheduler } from './services/scheduler';
import { initErrorMonitoring } from './services/monitoring';

initErrorMonitoring();

// Prisma の BIGINT 列（maxAmount 等）を res.json で安全に返すための保険。
// 未設定だと JSON.stringify が BigInt で TypeError を投げ、補助金APIが500になる。
(BigInt.prototype as any).toJSON = function () { return Number(this); };

const app = express();
const PORT = process.env.PORT || 4000;

app.use(requestId);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'リクエストが多すぎます。しばらくしてから再試行してください。' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '認証リクエストが多すぎます。15分後に再試行してください。' },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '2mb' }));
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  startScheduler();
});
