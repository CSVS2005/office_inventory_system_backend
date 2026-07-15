import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, 'id' | 'role_name' | 'owner_id' | 'status' | 'full_name' | 'email'>;
    }
  }
}
