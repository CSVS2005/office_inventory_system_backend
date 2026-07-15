import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { reportQuerySchema } from '../validators/reports';
import { getInventoryReport, getDeviceStatusReport, exportInventoryExcel, exportInventoryPdf } from '../controllers/reportsController';

export const reportsRouter = Router();

reportsRouter.use(authenticateToken, authorizeRole('admin'));

reportsRouter.get('/inventory', validateQuery(reportQuerySchema), getInventoryReport);
reportsRouter.get('/device-status', getDeviceStatusReport);
reportsRouter.get('/inventory/excel', validateQuery(reportQuerySchema), exportInventoryExcel);
reportsRouter.get('/inventory/pdf', validateQuery(reportQuerySchema), exportInventoryPdf);
