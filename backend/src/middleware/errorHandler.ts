import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const id = (req as any).id;
  const status = err.status || 500;
  console.error(`[error]${id ? ` [${id}]` : ''} ${req.method} ${req.originalUrl} -> ${status}:`, err.message || err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : (err.message || 'Error'),
    ...(id ? { requestId: id } : {}),
  });
}
