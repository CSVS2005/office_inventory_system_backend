import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { listPersonnel, createPersonnel, updatePersonnel } from '../controllers/personnelController';
import { validateBody } from '../middleware/validation';
import { personnelCreateSchema, personnelUpdateSchema } from '../validators/personnel';

export const personnelRouter = Router();

personnelRouter.use(authenticateToken, authorizeRole('admin'));

personnelRouter.get('/', listPersonnel);
personnelRouter.post('/', validateBody(personnelCreateSchema), createPersonnel);
personnelRouter.put('/:id', validateBody(personnelUpdateSchema), updatePersonnel);
