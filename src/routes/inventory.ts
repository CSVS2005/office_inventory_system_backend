import { Router } from 'express';
import { authenticateToken, authorizeRole, loadPersonnelForUser } from '../middleware/auth';
import { listInventory, createInventory, updateInventory, deleteInventory } from '../controllers/inventoryController';
import { validateBody, validateQuery } from '../middleware/validation';
import { inventoryCreateSchema, inventoryUpdateSchema, inventoryQuerySchema } from '../validators/inventory';

export const inventoryRouter = Router();

inventoryRouter.use(authenticateToken, loadPersonnelForUser);

inventoryRouter.get('/', validateQuery(inventoryQuerySchema), listInventory);
inventoryRouter.post('/', validateBody(inventoryCreateSchema), createInventory);
inventoryRouter.put('/:id', validateBody(inventoryUpdateSchema), updateInventory);
inventoryRouter.delete('/:id', deleteInventory);
