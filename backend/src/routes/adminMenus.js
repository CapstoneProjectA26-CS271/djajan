import { Router } from 'express';
import {
  createMenu,
  deleteMenu,
  getAdminMenu,
  getAdminMenus,
  updateMenu,
} from '../services/menuService.js';
import { assertMenuId, validateCreateMenu, validateUpdateMenu } from '../validators/menuValidator.js';

// Mounted under /api/admin/menus behind requireAuth (see app.js).
export const adminMenuRouter = Router();

adminMenuRouter.get('/', async (req, res) => {
  const menus = await getAdminMenus();
  res.json({ status: 'success', data: { menus } });
});

adminMenuRouter.get('/:id', async (req, res) => {
  assertMenuId(req.params.id);
  const menu = await getAdminMenu(req.params.id);
  res.json({ status: 'success', data: { menu } });
});

adminMenuRouter.post('/', async (req, res) => {
  const menu = await createMenu(validateCreateMenu(req.body));
  res.status(201).json({ status: 'success', data: { menu } });
});

adminMenuRouter.put('/:id', async (req, res) => {
  assertMenuId(req.params.id);
  const menu = await updateMenu(req.params.id, validateUpdateMenu(req.body));
  res.json({ status: 'success', data: { menu } });
});

adminMenuRouter.delete('/:id', async (req, res) => {
  assertMenuId(req.params.id);
  await deleteMenu(req.params.id);
  res.json({ status: 'success', data: { id: req.params.id } });
});
