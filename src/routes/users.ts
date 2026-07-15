import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/usersController';
import { validateBody } from '../middleware/validation';
import { userCreateSchema, userUpdateSchema, resetUserPasswordSchema } from '../validators/users';

export const usersRouter = Router();

usersRouter.use(authenticateToken, authorizeRole('admin'));

usersRouter.get('/', listUsers);
usersRouter.post('/', validateBody(userCreateSchema), createUser);
usersRouter.put('/:id', validateBody(userUpdateSchema), updateUser);
usersRouter.delete('/:id', deleteUser);
usersRouter.patch('/:id/reset-password', validateBody(resetUserPasswordSchema), resetUserPassword);
