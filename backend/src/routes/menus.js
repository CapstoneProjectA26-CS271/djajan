import { Router } from 'express';
import { getPublicMenuBySlug, getPublicMenus } from '../services/menuService.js';
import { assertMenuSlug, validateCategoryQuery } from '../validators/menuValidator.js';

export const menuRouter = Router();

menuRouter.get('/', async (req, res) => {
  const menus = await getPublicMenus(validateCategoryQuery(req.query.category));
  res.json({ status: 'success', data: { menus } });
});

menuRouter.get('/:slug', async (req, res) => {
  assertMenuSlug(req.params.slug);
  const menu = await getPublicMenuBySlug(req.params.slug);
  res.json({ status: 'success', data: { menu } });
});
