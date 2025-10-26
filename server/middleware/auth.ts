import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "未登录" });
  }
  next();
}

export function getCurrentUser(req: Request) {
  if (!req.session.userId) {
    return null;
  }
  return {
    id: req.session.userId,
    username: req.session.username || '',
    role: req.session.role || '业务'
  };
}
