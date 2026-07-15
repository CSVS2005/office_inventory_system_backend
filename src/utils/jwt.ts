import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  role_name: string;
  owner_id: number;
  status: string;
  full_name: string;
  email: string;
}

const secret = config.jwtSecret as jwt.Secret;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, secret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded as unknown as JwtPayload;
}
