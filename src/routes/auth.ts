import { Router } from 'express';
import { login, signup, forgotPassword, resetPassword, getProfile } from '../controllers/authController';
import { validateBody } from '../middleware/validation';
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth';
import { authenticateToken } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/signup', validateBody(signupSchema), signup);
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
authRouter.get('/me', authenticateToken, getProfile);
