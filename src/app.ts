import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { personnelRouter } from './routes/personnel';
import { usersRouter } from './routes/users';
import { inventoryRouter } from './routes/inventory';
import { reportsRouter } from './routes/reports';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './db/prisma';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'Office Inventory System backend is running' });
});

app.get('/test-db', async (req, res) => {
  const result = await prisma.$queryRaw<{ status: number }[]>`SELECT 1 as status`;
  res.json(result);
});

app.use(['/auth', '/api/auth'], authRouter);
app.use(['/dashboard', '/api/dashboard'], dashboardRouter);
app.use(['/personnel', '/api/personnel'], personnelRouter);
app.use(['/users', '/api/users'], usersRouter);
app.use(['/inventory', '/api/inventory'], inventoryRouter);
app.use(['/reports', '/api/reports'], reportsRouter);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);
