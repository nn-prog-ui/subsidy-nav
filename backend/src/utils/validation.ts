import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const registerSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上にしてください').max(100),
  name: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const consultingSchema = z.object({
  name: z.string().min(1, 'お名前は必須です').max(100),
  email: z.string().email('メールアドレスの形式が正しくありません'),
  company: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  prefecture: z.string().max(20).optional(),
  industry: z.string().max(50).optional(),
  employees: z.string().max(20).optional(),
  budget: z.string().max(50).optional(),
  message: z.string().min(1, 'お問い合わせ内容は必須です').max(2000),
});

export const alertSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  prefectures: z.array(z.string()).optional(),
  municipalityCodes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

export const matchingSchema = z.object({
  prefecture: z.string().min(1),
  industry: z.string().min(1),
  employees: z.string().min(1),
});

/**
 * zodスキーマで req.body を検証するExpressミドルウェアを返す。
 * 失敗時は 400 と最初のエラーメッセージを返す。
 */
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      return res.status(400).json({ error: first?.message || '入力が不正です', field: first?.path?.join('.') });
    }
    req.body = result.data;
    next();
  };
}
