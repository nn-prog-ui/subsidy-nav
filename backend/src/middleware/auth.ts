import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtAdminPayload { id: string; email: string; }
interface JwtUserPayload { id: string; email: string; }

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'secret') as JwtAdminPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'secret') as JwtUserPayload;
    (req as any).userId = payload.id;
    (req as any).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
