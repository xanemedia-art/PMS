import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    hotelId: number;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'changeme123', (err: any, user: any) => {
    if (err) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = [...roles];

    // management role can access anything allowed for admin or manager
    if (roles.includes('admin') || roles.includes('manager')) {
      allowedRoles.push('management');
    }
    // front_desk role can access anything allowed for staff
    if (roles.includes('staff')) {
      allowedRoles.push('front_desk');
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(401).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    next();
  };
};
