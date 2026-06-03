import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: '입력값이 올바르지 않습니다.',
      errors: err.errors,
    });
  }
  console.error(err);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
}
