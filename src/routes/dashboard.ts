import { Router } from 'express';
import { authenticateToken, loadPersonnelForUser } from '../middleware/auth';
import { getDashboard } from '../controllers/dashboardController';

export const dashboardRouter = Router();

dashboardRouter.get('/', authenticateToken, loadPersonnelForUser, getDashboard);
